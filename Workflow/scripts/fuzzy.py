#!/usr/bin/env python3
# -*- coding: utf-8 -*-


#
# Copyright (c) 2017 Dean Jackson <deanishe@deanishe.net>
#
# MIT Licence. See http://opensource.org/licenses/MIT
#
# Created on 2017-09-09
#

"""Add fuzzy search to your Alfred 3 Script Filters.

This script is a replacement for Alfred's "Alfred filters results"
feature that provides a fuzzy search algorithm.

To use in your Script Filter, you must export the user query to
the ``query`` environment variable, and call your own script via this
one.

If your Script Filter (using Language = /bin/bash) looks like this:

    /usr/bin/python myscript.py

Change it to this:

    export query="$1"
    ./fuzzy.py /usr/bin/env python3 myscript.py

Your script will be run once per session (while the use is using your
workflow) to retrieve and cache all items, then the items are filtered
against the user query on their titles using a fuzzy matching algorithm.

"""

from __future__ import print_function, absolute_import

import json
import os
from subprocess import check_output
import sys
import time
from unicodedata import normalize

# Name of workflow variable storing session ID
SID = os.getenv('session_var') or 'fuzzy_session_id'

# Bonus for adjacent matches
adj_bonus = int(os.getenv('adj_bonus') or '5')
# Bonus if match is uppercase
camel_bonus = int(os.getenv('camel_bonus') or '10')
# Penalty for each character before first match
lead_penalty = int(os.getenv('lead_penalty') or '-3')
# Max total ``lead_penalty``
max_lead_penalty = int(os.getenv('max_lead_penalty') or '-9')
# Bonus if after a separator
sep_bonus = int(os.getenv('sep_bonus') or '10')
# Penalty for each unmatched character
unmatched_penalty = int(os.getenv('unmatched_penalty') or '-1')


def log(s, *args):
    """Simple STDERR logger."""
    if args:
        s = s % args
    print('[fuzzy] ' + s, file=sys.stderr)


def fold_diacritics(u):
    """Remove diacritics from Unicode string."""
    u = normalize('NFD', u)
    s = u.encode('us-ascii', 'ignore')
    return unicode(s)


def isascii(u):
    """Return ``True`` if Unicode string contains only ASCII characters."""
    return u == fold_diacritics(u)


def decode(s):
    """Decode and NFC-normalise string."""
    if not isinstance(s, unicode):
        if isinstance(s, str):
            s = s.decode('utf-8')
        else:
            s = unicode(s)

    return normalize('NFC', s)


class Fuzzy(object):
    """Fuzzy comparison of strings.

    Attributes:
        adj_bonus (int): Bonus for adjacent matches
        camel_bonus (int): Bonus if match is uppercase
        lead_penalty (int): Penalty for each character before first match
        max_lead_penalty (int): Max total ``lead_penalty``
        sep_bonus (int): Bonus if after a separator
        unmatched_penalty (int): Penalty for each unmatched character

    """

    def __init__(self, adj_bonus=adj_bonus, sep_bonus=sep_bonus,
                 camel_bonus=camel_bonus, lead_penalty=lead_penalty,
                 max_lead_penalty=max_lead_penalty,
                 unmatched_penalty=unmatched_penalty):
        self.adj_bonus = adj_bonus
        self.sep_bonus = sep_bonus
        self.camel_bonus = camel_bonus
        self.lead_penalty = lead_penalty
        self.max_lead_penalty = max_lead_penalty
        self.unmatched_penalty = unmatched_penalty
        self._cache = {}

    def filter_feedback(self, fb, query):
        """Filter feedback dict.

        The titles of ``items`` in feedback dict are compared against
        ``query``. Items that don't match are removed and the remainder
        are sorted by best match.

        Args:
            fb (dict): Parsed Alfred feedback JSON
            query (str): Query to filter items against

        Returns:
            dict: ``fb`` with items sorted/removed.
        """
#       fold = isascii(query)
        items = []

        for it in fb['items']:
            title = it['title']
#           if fold:
#               title = fold_diacritics(title)

            ok, score = self.match(query, title)
            if not ok:
                continue

            items.append((score, it))

        items.sort(key=lambda i: i[0], reverse=True)
        fb['items'] = [it for _, it in items]
        return fb

    # https://gist.github.com/menzenski/f0f846a254d269bd567e2160485f4b89
    def match(self, query, instring):
        """Return match boolean and match score.

        Args:
            query (str): Query to match against
            instring (str): String to score against query

        Returns:
            tuple: (match, score) where ``match`` is `True`/`False` and
                ``score`` is a `float`. The higher the score, the better
                the match.s
        """
        # cache results
        key = (query, instring)
        if key in self._cache:
            return self._cache[key]

        adj_bonus = self.adj_bonus
        sep_bonus = self.sep_bonus
        camel_bonus = self.camel_bonus
        lead_penalty = self.lead_penalty
        max_lead_penalty = self.max_lead_penalty
        unmatched_penalty = self.unmatched_penalty

        score, q_idx, s_idx, q_len, s_len = 0, 0, 0, len(query), len(instring)
        prev_match, prev_lower = False, False
        prev_sep = True  # so that matching first letter gets sep_bonus
        best_letter, best_lower, best_letter_idx = None, None, None
        best_letter_score = 0
        matched_indices = []

        while s_idx != s_len:
            p_char = query[q_idx] if (q_idx != q_len) else None
            s_char = instring[s_idx]
            p_lower = p_char.lower() if p_char else None
            s_lower, s_upper = s_char.lower(), s_char.upper()

            next_match = p_char and p_lower == s_lower
            rematch = best_letter and best_lower == s_lower

            advanced = next_match and best_letter
            p_repeat = best_letter and p_char and best_lower == p_lower

            if advanced or p_repeat:
                score += best_letter_score
                matched_indices.append(best_letter_idx)
                best_letter, best_lower, best_letter_idx = None, None, None
                best_letter_score = 0

            if next_match or rematch:
                new_score = 0

                # apply penalty for each letter before the first match
                # using max because penalties are negative (so max = smallest)
                if q_idx == 0:
                    score += max(s_idx * lead_penalty, max_lead_penalty)

                # apply bonus for consecutive matches
                if prev_match:
                    new_score += adj_bonus

                # apply bonus for matches after a separator
                if prev_sep:
                    new_score += sep_bonus

                # apply bonus across camelCase boundaries
                if prev_lower and s_char == s_upper and s_lower != s_upper:
                    new_score += camel_bonus

                # update query index iff the next query letter was matched
                if next_match:
                    q_idx += 1

                # update best letter match (may be next or rematch)
                if new_score >= best_letter_score:
                    # apply penalty for now-skipped letter
                    if best_letter is not None:
                        score += unmatched_penalty
                    best_letter = s_char
                    best_lower = best_letter.lower()
                    best_letter_idx = s_idx
                    best_letter_score = new_score

                    prev_match = True

            else:
                score += unmatched_penalty
                prev_match = False

            prev_lower = s_char == s_lower and s_lower != s_upper
            prev_sep = s_char in '_ '

            s_idx += 1

        if best_letter:
            score += best_letter_score
            matched_indices.append(best_letter_idx)

        res = (q_idx == q_len, score)
        self._cache[key] = res
        return res


class Cache(object):
    """Caches script output for the session.

    Attributes:
        cache_dir (str): Directory where script output is cached
        cmd (list): Command to run your script

    """

    def __init__(self, cmd):
        self.cmd = cmd
        self.cache_dir = os.path.join(os.getenv('alfred_workflow_cache',default=None),
                                      '_fuzzy')
        self._cache_path = None
        self._session_id = None
        self._from_cache = False

    def load(self):
        """Return parsed Alfred feedback from cache or command.

        Returns:
            dict: Parsed Alfred feedback.

        """
        sid = self.session_id
        if self._from_cache and os.path.exists(self.cache_path):
            log('loading cached items ...')
            with open(self.cache_path, 'r') as fp:
                js = fp.read()
        else:
            log('running command %r ...', self.cmd)
            js = check_output(self.cmd)

        fb = json.loads(js)
        log('loaded %d item(s)', len(fb.get('items', [])))

        if not self._from_cache:  # add session ID
            if 'variables' in fb:
                fb['variables'][SID] = sid
            else:
                fb['variables'] = {SID: sid}

            log('added session id %r to results', sid)

            with open(self.cache_path, 'w') as fp:
                json.dump(fb, fp)
                log('cached script results to %r', self.cache_path)

        return fb

    @property
    def session_id(self):
        """ID for this session."""
        if not self._session_id:
            sid = os.getenv(SID)
            if sid:
                self._session_id = sid
                self._from_cache = True
            else:
                self._session_id = str(os.getpid())

        return self._session_id

    @property
    def cache_path(self):
        """Return cache path for this session."""
        if not self._cache_path:
            if not os.path.exists(self.cache_dir):
                os.makedirs(self.cache_dir, 0o700)
                log('created cache dir %r', self.cache_dir)

            self._cache_path = os.path.join(self.cache_dir,
                                            self.session_id + '.json')

        return self._cache_path

    def clear(self):
        """Delete cached files."""
        if not os.path.exists(self.cache_dir):
            return

        for fn in os.listdir(self.cache_dir):
            os.unlink(os.path.join(self.cache_dir, fn))

        log('cleared old cache files')


def main():
    """Perform fuzzy search on JSON output by specified command."""
    start = time.time()
    log('.')  # ensure logging output starts on a new line
    cmd = sys.argv[1:]
    query = os.getenv('query')
    log('cmd=%r, query=%r, session_id=%r', cmd, query,
        os.getenv(SID))

    cache = Cache(cmd)
    fb = cache.load()

    if query:
#        query = decode(query)
        fz = Fuzzy()
        fz.filter_feedback(fb, query)
        log('%d item(s) match %r', len(fb['items']), query)

    json.dump(fb, sys.stdout)
    log('fuzzy filtered in %0.2fs', time.time() - start)


if __name__ == '__main__':
    main()
    
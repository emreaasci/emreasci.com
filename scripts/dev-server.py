#!/usr/bin/env python3
"""Geliştirme sunucusu: önbelleği kapatır, böylece tarayıcı her yenilemede güncel dosyaları alır."""
import http.server, functools, os, sys

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
handler = functools.partial(NoCache, directory=root)
http.server.ThreadingHTTPServer(('127.0.0.1', port), handler).serve_forever()

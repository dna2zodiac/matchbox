```
uol:
protocol/path/to/sth

e.g.
https://www.google.com
https://www.baidu.com
index://3ade/8a44/3ade8a4460b7f6d

trie: a b c d e--> 1 2 3
       \ \ \ \---> 4 5 6
        \ \ \----> 1 7 9
         \ \-----> 4 6 8
          \------> 3 4 5

query: abc -> 179
query: abcade -> [o] abc a [x] de -> 179 345
```

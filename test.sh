#!/usr/bin/env bash
#npm run demo
gitLength=$(git ls-files -m | wc -m)
if [ gitLength > 0 ]; then
	echo "output has changed"
	exit 1
else
	exit 0
fi
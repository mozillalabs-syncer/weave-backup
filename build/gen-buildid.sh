#!/bin/sh
hg tip --style=default 2>/dev/null | grep ^changeset | awk '{print $2}' | awk -F: '{print $1}'


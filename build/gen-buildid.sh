#!/bin/sh
hg tip 2>/dev/null | grep ^changeset | awk '{print $2}' | awk -F: '{print $1}'
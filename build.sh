#!/bin/sh

cd chrome
zip -9 -ur sync.jar *
cd ..
zip -9 -ur sync.xpi chrome/sync.jar defaults components install.rdf chrome.manifest

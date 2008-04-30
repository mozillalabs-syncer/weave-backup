#
# ***** BEGIN LICENSE BLOCK *****
# Version: MPL 1.1/GPL 2.0/LGPL 2.1
#
# The contents of this file are subject to the Mozilla Public License Version
# 1.1 (the "License"); you may not use this file except in compliance with
# the License. You may obtain a copy of the License at
# http://www.mozilla.org/MPL/
#
# Software distributed under the License is distributed on an "AS IS" basis,
# WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
# for the specific language governing rights and limitations under the
# License.
#
# The Original Code is Weave code.
#
# The Initial Developer of the Original Code is
# Mozilla Corporation
# Portions created by the Initial Developer are Copyright (C) 2008
# the Initial Developer. All Rights Reserved.
#
# Contributor(s):
#   Dan Mills <thunder@mozilla.com> (original author)
#
# Alternatively, the contents of this file may be used under the terms of
# either the GNU General Public License Version 2 or later (the "GPL"), or
# the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
# in which case the provisions of the GPL or the LGPL are applicable instead
# of those above. If you wish to allow use of your version of this file only
# under the terms of either the GPL or the LGPL, and not to allow others to
# use your version of this file under the terms of the MPL, indicate your
# decision by deleting the provisions above and replace them with the notice
# and other provisions required by the GPL or the LGPL. If you do not delete
# the provisions above, a recipient may use your version of this file under
# the terms of any one of the MPL, the GPL or the LGPL.
#
# ***** END LICENSE BLOCK *****

sdkdir ?= ${MOZSDKDIR}
harnessdir = ../harness
topsrcdir ?= ${TOPSRCDIR}
native_topsrcdir ?= ${NATIVE_TOPSRCDIR}

ifeq ($(topsrcdir),)
topsrcdir = ../..
endif

ifeq ($(native_topsrcdir),)
native_topsrcdir = ../..
endif

xpcshell = $(sdkdir)/bin/xpcshell

head := -f $(harnessdir)/head.js $(patsubst %,-f %,$(wildcard head*.js))
tail := $(patsubst %,-f %,$(wildcard tail*.js)) -f $(harnessdir)/tail.js
tests := $(wildcard test*.js)

all: $(tests:.js=)

$(tests:.js=): $(tests)
	NATIVE_TOPSRCDIR="$(native_topsrcdir)" TOPSRCDIR="$(topsrcdir)" \
	$(xpcshell) -s $(head) -f $(@).js $(tail) 2> $(@).log 1>&2
	if [ `grep -c '\*\*\* PASS' $(@).log` = 0 ]; then exit 1; fi

$(tests:.js=-interactive): $(tests)
	NATIVE_TOPSRCDIR="$(native_topsrcdir)" TOPSRCDIR="$(topsrcdir)" \
	$(xpcshell) -s $(head) -f $(@:-interactive=).js $(tail) -i 2>&1

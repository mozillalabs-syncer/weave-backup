#!/usr/bin/env perl -w

use strict;
use File::Copy;

my $file = shift @ARGV;
my @subst;
foreach (@ARGV) {
  m/^([^=]*)=(.*)$/ or next;
  push @subst, [$1, $2];
}

copy "$file.in", $file;
open SRC, "<$file.in" or die "Could not open '$file.in': $!";
open DEST, ">$file" or die "Could not open '$file': $!";

while (my $line = <SRC>) {
  foreach my $subst (@subst) {
    $line =~ s/\@$subst->[0]\@/$subst->[1]/g;
  }
  print DEST $line;
}

close DEST;
close SRC;

exit 0;

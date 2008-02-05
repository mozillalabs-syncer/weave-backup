@echo off

set drive=%~d1
set path=%~f1
shift

rem %* doesn't change after shift, so we do this hack to support a few more params :-(

set cmd=%1
shift
set arg1=%1
shift
set arg2=%1
shift
set arg3=%1
shift
set arg4=%1
shift
set arg5=%1
shift

%drive%
chdir "%path%"

%cmd% %arg1% %arg2% %arg3% %arg4% %arg5% %1 %2 %3 %4 %5 %6 %7 %8 %9

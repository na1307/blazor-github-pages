#!/usr/bin/bash

verifyExitCode() {
  if [ $2 -eq 0 ]; then
    echo $1 verify passed.
  else
    echo $1 verify failed.
    exit 1
  fi
}

if [ $1 == "--main-repo=false" ]; then
  MAINREPO=false;
elif [ $1 == "--main-repo=true" ]; then
  MAINREPO=true;
else
  echo Unknown Argument.
  exit 1
fi

if [ $MAINREPO == true ]; then
  grep -i 'base href="/"' _out/wwwroot/index.html > /dev/null
  verifyExitCode index $?
else
  grep -i "base href=\"/$2/\"" _out/wwwroot/index.html > /dev/null
  verifyExitCode index $?
fi

if [ -e _out/wwwroot/404.html ]; then
  if [ $MAINREPO == true ]; then
    grep -i "/?p=/" _out/wwwroot/404.html > /dev/null
    verifyExitCode 404 $?
  elif [ $MAINREPO == false ]; then
    grep -i "/$2/?p=/" _out/wwwroot/404.html > /dev/null
    verifyExitCode 404 $?
  fi
fi

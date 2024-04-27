#!/usr/bin/bash

if [ $1 == "--non-main-repo" ]; then
    MAINREPO=false;
elif [ $1 == "--main-repo" ]; then
    MAINREPO=true;
else
    echo Unknown Argument.
    exit 1
fi

if [ ! -f _out/wwwroot/.nojekyll ]; then
    echo ".nojekyll doesn't exist!"
    exit 1
fi

if [ $MAINREPO == true ]; then
    grep -i 'base href="/"' _out/wwwroot/index.html > /dev/null
else
    grep -i "base href=\"/$2/\"" _out/wwwroot/index.html > /dev/null
fi

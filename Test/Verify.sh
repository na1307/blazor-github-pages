#!/usr/bin/bash

if [ $1 == "--non-main-repo" ]; then
    MAINREPO=false;
elif [ $1 == "--main-repo" ]; then
    MAINREPO=true;
else
    echo Unknown Argument.
    exit 1
fi

if [ $2 == "--no-fix-404" ]; then
    FIX404=false;
elif [ $2 == "--fix-404" ]; then
    FIX404=true;
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
    grep -i "base href=\"/$3/\"" _out/wwwroot/index.html > /dev/null
fi

if [ $MAINREPO == false ] && [ $FIX404 == true ]; then
    grep -i "/$3/?p=/" _out/wwwroot/404.html > /dev/null
else
    ! grep -i "/$3/?p=/" _out/wwwroot/404.html > /dev/null
fi

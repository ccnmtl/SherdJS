tar -c --exclude='.*' --exclude='build.sh' --exclude='package.json' -f - * | gzip > sherdjs-0.2.6.tar.gz

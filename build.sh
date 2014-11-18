tar -c --exclude='.*' --exclude='build.sh' --exclude='package.json' -f - * | gzip > sherdjs-0.4.4.tar.gz

tar -c --exclude='.*' --exclude='build.sh' --exclude='package.json' -f - * | gzip > sherdjs-0.2.1.tar.gz

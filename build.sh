tar -c --exclude='.*' --exclude='build.sh' --exclude='package.json' -f - * | gzip > sherdjs-0.4.8.tar.gz

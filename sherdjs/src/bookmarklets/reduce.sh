#!/bin/bash
cat sherd_video.js| perl -pe 's/^\s*//g' |perl -pe 's/\s*\n//g' |perl -pe 's|/\*.*?\*/|/**/|g'

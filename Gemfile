source "https://rubygems.org"

# Jekyll 4.x, not the `github-pages` gem.
#
# `github-pages` exists to mirror the legacy GitHub Pages builder, and it pins
# Jekyll 3.9 plus nokogiri 1.13, which caps Ruby at < 3.2. Since this site is
# built by .github/workflows/deploy.yml rather than by the legacy builder, that
# constraint buys nothing and blocks modern Ruby.
gem "jekyll", "~> 4.4"

# Required to run `jekyll serve` on Ruby 3+.
gem "webrick", "~> 1.9"

# Windows does not include zoneinfo files, so bundle the tzinfo-data gem
# gem 'tzinfo-data', platforms: [:mingw, :mswin, :x64_mingw, :jruby]

all: install-dependencies build

install-dependencies:
	sudo apt update
	sudo apt install libwebkit2gtk-4.1-dev \
    build-essential \
    curl \
    wget \
    file \
    libxdo-dev \
    libssl-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev

build:
	rm -rf ./www
	npx tauri build

install: build
	sudo cp src-tauri/target/release/bundle/deb/setup-utility_*.deb /tmp/
	sudo dpkg -i /tmp/setup-utility_*_amd64.deb

run:
	npx tauri dev

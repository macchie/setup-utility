all: install-dependencies build

DOCKER_IMAGE="registry.elvispos.com/tauri-builder:bookworm"
DOCKER_IMAGE_EXISTS=$(shell docker image inspect registry.elvispos.com/tauri-builder:bookworm > /dev/null 2>&1 && echo "true" || echo "false")

DEPLOY_TARGET="192.168.1.61"

generate-icons:
	npx tauri icon ./src/assets/icon.png

run:
	npx tauri dev

check-docker-image:
	@if [ "${DOCKER_IMAGE_EXISTS}" = "false" ]; then \
		echo "[i] Tauri Builder Docker Image not found! Building..."; \
		docker image build -t ${DOCKER_IMAGE} -f Dockerfile.build .; \
	fi

build: check-docker-image
	docker build -t ${DOCKER_IMAGE} -f Dockerfile.build .
	docker run --rm -v "$(shell pwd)":/app ${DOCKER_IMAGE} \
		/bin/bash -c "cd /app && npm install && rm -rf /app/www && npx tauri build"

install:
	sudo cp src-tauri/target/release/bundle/deb/setup-utility_*.deb /tmp/
	sudo dpkg -i /tmp/setup-utility_*_amd64.deb

deploy:
	echo "Deploy..."
	scp src-tauri/target/release/bundle/deb/setup-utility_*.deb elvispos@$(DEPLOY_TARGET):/tmp/
	echo "Installing on remote target"
	ssh elvispos@$(DEPLOY_TARGET) 'echo "PelvisP0s" | sudo -S dpkg -i /tmp/setup-utility_*_amd64.deb'
	echo "Deployment complete"
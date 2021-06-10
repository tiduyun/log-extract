ROOT_DIR := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))

VERSION_FILE ?= $(ROOT_DIR)/.version
PREFIX ?= tdio
BUILD_GIT_HEAD := $(shell git rev-parse HEAD)

# > make ver=1.0.1
BUILD_VERSION := $(ver)

ifneq (,$(wildcard .VERSION_FILE))
	BUILD_VERSION := $(shell cat $(VERSION_FILE))
endif

ifeq ($(BUILD_VERSION),'')
	$(error Please run 'make version' first)
endif

.DEFAULT_GOAL := build

docker-build = \
	export PREFIX=$(PREFIX); \
	export BUILD_VERSION=$(BUILD_VERSION); \
	docker buildx bake $(1)

# enable push mode: > make push=1 build
docker-build-args = \
	--set *.args.BUILD_VERSION=$(BUILD_VERSION) \
	--set *.args.BUILD_GIT_HEAD=$(BUILD_GIT_HEAD) \
	$(if $(push),--push,--load)

version:
	@read -p "Enter a new version:${BUILD_VERSION:+ (current: $(BUILD_VERSION))} " v; \
	if [ "$$v" ]; then \
		echo "The publish version is: $$v"; \
		echo $$v > $(VERSION_FILE); \
	fi


guard-%:
	@if [ "${${*}}" = "" ]; then \
			echo "Environment variable $* not set"; \
			exit 1; \
	fi

log-extract-${BUILD_VERSION}.tgz: guard-BUILD_VERSION
	yarn build
	npm pack

build: log-extract-${BUILD_VERSION}.tgz
	$(call docker-build, $(docker-build-args))

clean:
	rm -f $(VERSION_FILE)
	rm -f log-extract-*.tgz

.PHONY: build

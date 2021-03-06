# by allex_wang

function image_name {
  params = [prefix, name]
  result = notequal("", prefix) ? "${prefix}/${name}" : "${name}"
}

variable "NAME" {
  default = "daily-agent"
}

variable "PREFIX" {
  default = "tdio"
}

variable "BUILD_VERSION" {
  default = "1.0.0"
}

group "default" {
  targets = ["mainline"]
}

target "mainline" {
  context = "."
  dockerfile = "Dockerfile"
  args = {
    BUILD_VERSION = ""
    BUILD_GIT_HEAD = ""
  }
  tags = [
    "${image_name(PREFIX, NAME)}:${BUILD_VERSION}",
    "${image_name(PREFIX, NAME)}:latest"
  ]
  platforms = ["linux/amd64", "linux/arm64"]
}

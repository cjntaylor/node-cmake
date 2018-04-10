cmake_minimum_required(VERSION 3.1)

project(example VERSION 1.0.0)

list (APPEND CMAKE_MODULE_PATH ${CMAKE_SOURCE_DIR}/node_modules/node-cmake)
include(NodeJS)

nodejs_init()

add_nodejs_module(${PROJECT_NAME} src/hello.cc)

cmake_minimum_required(VERSION 3.1)

project(example VERSION 1.0.0)

include(../NodeJS.cmake)
nodejs_init()

add_nodejs_module(${PROJECT_NAME} src/hello.cc)

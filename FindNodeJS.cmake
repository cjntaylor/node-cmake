# This script uses CMake 3.1+ features
if(CMAKE_MINIMUM_REQUIRED_VERSION VERSION_LESS 3.1.0)
    message(FATAL_ERROR "FindNodeJS.cmake uses CMake 3.1+ features")
endif()

# Capture module information
set(NodeJS_MODULE_PATH ${CMAKE_CURRENT_LIST_DIR})
get_filename_component(NodeJS_MODULE_NAME ${NodeJS_MODULE_PATH} NAME)

# Allow users to specify the installed location of the Node.js package
set(NodeJS_ROOT_DIR "" CACHE PATH 
    "The root directory of the node.js installed package")

# Allow users to specify that downloaded sources should be used
option(NodeJS_DOWNLOAD "Download the required source files" Off)

# Allow users to force downloading of node packages
option(NodeJS_FORCE_DOWNLOAD "Download the source files every time" Off)

# Allow users to force archive extraction
option(NodeJS_FORCE_EXTRACT "Extract the archive every time" Off)

if(WIN32)
    # Allow users to specify that the executable should be downloaded
    option(NodeJS_DOWNLOAD_EXECUTABLE
        "Download matching executable if available" Off
    )
endif()

# Try to find the node.js executable
# The node executable under linux may not be the correct program
find_program(NodeJS_EXECUTABLE 
    NAMES node
    PATHS ${NodeJS_ROOT_DIR}
    PATH_SUFFIXES nodejs node
)
execute_process(
    COMMAND ${NodeJS_EXECUTABLE} --version
    RESULT_VARIABLE NodeJS_VALIDATE_EXECUTABLE
    OUTPUT_VARIABLE NodeJS_INSTALLED_VERSION
    OUTPUT_STRIP_TRAILING_WHITESPACE
)

# If node isn't the node.js binary, try the nodejs binary
if(NOT NodeJS_VALIDATE_EXECUTABLE EQUAL 0)
    find_program(NodeJS_EXECUTABLE
        NAMES nodejs
        PATHS ${NodeJS_ROOT_DIR}
        PATH_SUFFIXES nodejs node
    )
    execute_process(
        COMMAND ${NodeJS_EXECUTABLE} --version
        RESULT_VARIABLE NodeJS_VALIDATE_EXECUTABLE
        OUTPUT_VARIABLE NodeJS_INSTALLED_VERSION
        OUTPUT_STRIP_TRAILING_WHITESPACE
    )

    if(NOT NodeJS_VALIDATE_EXECUTABLE EQUAL 0)
        message(WARNING "Node.js executable could not be found. \
        Set NodeJS_ROOT_DIR to the installed location of the executable or \
        install Node.js to its default location.")
    endif()
endif()

list(APPEND NodeJS_OTHER_COMPONENTS
    X64 IA32 ARM WIN32 LINUX DARWIN
)
set(NodeJS_COMPONENTS_CONTAINS_VARIANT False)
foreach(NodeJS_COMPONENT ${NodeJS_FIND_COMPONENTS})
    list(FIND NodeJS_OTHER_COMPONENTS ${NodeJS_COMPONENT} NodeJS_OTHER_INDEX)
    if(NodeJS_OTHER_INDEX EQUAL -1)
        set(NodeJS_COMPONENTS_CONTAINS_VARIANT True)
        break()
    endif()
endforeach()

# Get the targeted version of Node.js (or one of its derivatives)
if(NodeJS_FIND_VERSION)
    set(NodeJS_VERSION ${NodeJS_FIND_VERSION})
elseif(NodeJS_INSTALLED_VERSION AND NOT NodeJS_COMPONENTS_CONTAINS_VARIANT)
    string(SUBSTRING ${NodeJS_INSTALLED_VERSION} 1 -1 NodeJS_VERSION)
else()
    message(FATAL_ERROR "Node.js version is not set. Set the VERSION \
    property of the find_package command to the required version of the \
    Node.js sources")
endif()

# Populate version variables, including version components
set(NodeJS_VERSION_STRING "v${NodeJS_VERSION}")
string(REPLACE "." ";" NodeJS_VERSION_PARTS ${NodeJS_VERSION})
list(GET NodeJS_VERSION_PARTS 0 NodeJS_VERSION_MAJOR)
list(GET NodeJS_VERSION_PARTS 1 NodeJS_VERSION_MINOR)
list(GET NodeJS_VERSION_PARTS 2 NodeJS_VERSION_PATCH)

# Determine the target platform for the compiled module
# Uses several mechanisms in order:
# 
# 1. CMake cache (allows overriding on the command line)
# 2. Component specification (set when calling find_package)
# 3. Node architecture when binary is available
# 4. CMake architecture
# 
set(NodeJS_PLATFORM "" CACHE STRING "Target node.js platform for module")
if(NOT NodeJS_PLATFORM)
    if(NodeJS_FIND_REQUIRED_WIN32)
        set(NodeJS_PLATFORM "win32")
    elseif(NodeJS_FIND_REQUIRED_LINUX)
        set(NodeJS_PLATFORM "linux")
    elseif(NodeJS_FIND_REQUIRED_DARWIN)
        set(NodeJS_PLATFORM "darwin")
    elseif(NodeJS_EXECUTABLE)
        execute_process(
            COMMAND ${NodeJS_EXECUTABLE} -p "process.platform"
            OUTPUT_VARIABLE NodeJS_PLATFORM
            OUTPUT_STRIP_TRAILING_WHITESPACE
        )
    elseif(WIN32)
        set(NodeJS_PLATFORM "win32")
    elseif(UNIX)
        if(APPLE)
            set(NodeJS_PLATFORM "darwin")
        else()
            set(NodeJS_PLATFORM "linux")
        endif()
    else()
        message(FATAL_ERROR "Node.js platform is not set. Add the platform \
        to the find_package components section or set NodeJS_PLATFORM in the \
        cache.")
    endif()
endif()

# Convenience variables for the platform type
if(NodeJS_PLATFORM STREQUAL "win32")
    set(NodeJS_PLATFORM_WIN32 True)
    set(NodeJS_PLATFORM_LINUX False)
    set(NodeJS_PLATFORM_DARWIN False)
elseif(NodeJS_PLATFORM STREQUAL "linux")
    set(NodeJS_PLATFORM_WIN32 False)
    set(NodeJS_PLATFORM_LINUX True)
    set(NodeJS_PLATFORM_DARWIN False)
elseif(NodeJS_PLATFORM STREQUAL "darwin")
    set(NodeJS_PLATFORM_WIN32 False)
    set(NodeJS_PLATFORM_LINUX False)
    set(NodeJS_PLATFORM_DARWIN True)
endif()

# Determine the target architecture for the compiled module
# Uses several mechanisms in order:
# 
# 1. CMake cache (allows overriding on the command line)
# 2. Component specification (set when calling find_package)
# 3. Node architecture when binary is available
# 4. Compiler architecture under MSVC
# 
set(NodeJS_ARCH "" CACHE STRING "Target node.js architecture for module")
if(NOT NodeJS_ARCH)
    if(NodeJS_FIND_REQUIRED_X64)
        set(NodeJS_ARCH "x64")
    elseif(NodeJS_FIND_REQUIRED_IA32)
        set(NodeJS_ARCH "ia32")
    elseif(NodeJS_FIND_REQUIRED_ARM)
        if(NodeJS_PLATFORM_WIN32)
            message(FATAL_ERROR "ARM is not supported under windows")
        endif()
        set(NodeJS_ARCH "arm")
    elseif(NodeJS_EXECUTABLE)
        execute_process(
            COMMAND ${NodeJS_EXECUTABLE} -p "process.arch"
            OUTPUT_VARIABLE NodeJS_ARCH
            OUTPUT_STRIP_TRAILING_WHITESPACE
        )
    elseif(MSVC)
        if(CMAKE_CL_64)
            set(NodeJS_ARCH "x64")
        else()
            set(NodeJS_ARCH "ia32")
        endif()
    else()
        message(FATAL_ERROR "Node.js architecture is not set. Add the \
        architecture to the find_package components section or set NodeJS_ARCH \
        in the cache.")
    endif()
endif()

# Convenience variables for the architecture
if(NodeJS_ARCH STREQUAL "x64")
    set(NodeJS_ARCH_X64 True)
    set(NodeJS_ARCH_IA32 False)
    set(NodeJS_ARCH_ARM False)
elseif(NodeJS_ARCH STREQUAL "ia32")
    set(NodeJS_ARCH_X64 False)
    set(NodeJS_ARCH_IA32 True)
    set(NodeJS_ARCH_ARM False)
elseif(NodeJS_ARCH STREQUAL "arm")
    set(NodeJS_ARCH_X64 False)
    set(NodeJS_ARCH_IA32 False)
    set(NodeJS_ARCH_ARM True)
endif()

#Include helper functions
include(NodeJSUtil)

# Variables for Node.js artifacts across variants
# Specify all of these variables for each new variant
set(NodeJS_VARIANT_NAME "")       # The printable name of the variant
set(NodeJS_VARIANT_BASE "")       # A file name safe version of the variant
set(NodeJS_URL "")                # The URL for the artifacts
set(NodeJS_SOURCE_PATH "")        # The URL path of the source archive
set(NodeJS_CHECKSUM_PATH "")      # The URL path of the checksum file
set(NodeJS_CHECKSUM_TYPE "")      # The checksum type (algorithm)
set(NodeJS_WIN32_LIBRARY_PATH "") # The URL path of the windows lib
set(NodeJS_WIN32_BINARY_PATH "")  # The URL path of the windows executable (opt)

set(NodeJS_INCLUDE_PATHS "") # Set of header prefixes inside the source archive
set(NodeJS_LIBRARIES "")     # The set of libraries to link the addon against

# NodeJS variants
# Selects download target based on configured component
include(NodeJS)

# Allow variants to specify the name of the library and executable for
# windows
# 
# If not specified, fall back to using the variant name and standard
# output extensions
if(NOT NodeJS_WIN32_LIBRARY_NAME)
    set(NodeJS_WIN32_LIBRARY_NAME ${NodeJS_VARIANT_BASE}.lib)
endif()
if(NOT NodeJS_WIN32_BINARY_NAME)
    set(NodeJS_WIN32_BINARY_NAME ${NodeJS_VARIANT_BASE}.exe)
endif()

# If the version we're looking for is the version that is installed,
# try finding the required headers. Don't do this under windows (where
# headers are not part of the installed content), when the user has
# specified that headers should be downloaded or when using a variant other
# than the default
if((NOT NodeJS_PLATFORM_WIN32) AND (NOT NodeJS_DOWNLOAD) AND
    NodeJS_VARIANT_NAME STREQUAL NodeJS_DEFAULT_VARIANT AND
    NodeJS_INSTALLED_VERSION STREQUAL NodeJS_VERSION_STRING)
    # node.h is really generic and too easy for cmake to find the wrong
    # file, so use the directory as a guard, and then just tack it on to
    # the actual path
    # 
    # Specifically ran into this under OSX, where python contains a node.h
    # that gets found instead
    find_path(NodeJS_INCLUDE_PARENT node/node.h)
    set(NodeJS_INCLUDE_DIRS ${NodeJS_INCLUDE_PARENT}/node)

    # Under all systems that support this, there are no libraries required
    # for linking (symbols are resolved via the main executable at runtime)
    set(NodeJS_LIBRARIES "")

# Otherwise, headers and required libraries must be downloaded to the project
# to supplement what is installed
else()
    # Create a folder for downloaded artifacts
    set(NodeJS_DOWNLOAD_PATH 
        ${CMAKE_CURRENT_BINARY_DIR}/${NodeJS_VARIANT_BASE}
    )
    set(NodeJS_DOWNLOAD_PATH ${NodeJS_DOWNLOAD_PATH}-${NodeJS_VERSION_STRING})
    file(MAKE_DIRECTORY ${NodeJS_DOWNLOAD_PATH})

    # Download the checksum file for validating all other downloads
    # Conveniently, if this doesn't download correctly, the setup fails
    # due to checksum failures
    set(NodeJS_CHECKSUM_FILE ${NodeJS_DOWNLOAD_PATH}/CHECKSUM)
    nodejs_download(
        ${NodeJS_URL}/${NodeJS_CHECKSUM_PATH}
        ${NodeJS_CHECKSUM_FILE}
        ${NodeJS_FORCE_DOWNLOAD}
    )
    file(READ ${NodeJS_CHECKSUM_FILE} NodeJS_CHECKSUM_DATA)

    # Download and extract the main source archive
    set(NodeJS_SOURCE_FILE ${NodeJS_DOWNLOAD_PATH}/sources.tar.gz)
    nodejs_checksum(
        ${NodeJS_CHECKSUM_DATA} ${NodeJS_SOURCE_PATH} NodeJS_SOURCE_CHECKSUM
    )
    nodejs_download(
        ${NodeJS_URL}/${NodeJS_SOURCE_PATH}
        ${NodeJS_SOURCE_FILE}
        ${NodeJS_SOURCE_CHECKSUM}
        ${NodeJS_CHECKSUM_TYPE}
        ${NodeJS_FORCE_DOWNLOAD}
    )
    set(NodeJS_HEADER_PATH ${NodeJS_DOWNLOAD_PATH}/src)
    nodejs_extract(
        ${NodeJS_SOURCE_FILE}
        ${NodeJS_HEADER_PATH}
        ${NodeJS_FORCE_EXTRACT}
    )

    # Populate include directories from the extracted source archive
    foreach(NodeJS_HEADER_BASE ${NodeJS_INCLUDE_PATHS})
        set(NodeJS_INCLUDE_DIR ${NodeJS_HEADER_PATH}/${NodeJS_HEADER_BASE})
        if(NOT EXISTS ${NodeJS_INCLUDE_DIR})
            message(FATAL_ERROR "Include does not exist: ${NodeJS_INCLUDE_DIR}")
        endif()
        list(APPEND NodeJS_INCLUDE_DIRS ${NodeJS_INCLUDE_DIR})
    endforeach()

    # Download required library files when targeting windows
    if(NodeJS_PLATFORM_WIN32)
        # Download the windows library
        set(NodeJS_WIN32_LIBRARY_FILE 
            ${NodeJS_DOWNLOAD_PATH}/lib/${NodeJS_ARCH}
        )
        set(NodeJS_WIN32_LIBRARY_FILE 
            ${NodeJS_WIN32_LIBRARY_FILE}/${NodeJS_WIN32_LIBRARY_NAME}
        )
        nodejs_checksum(
            ${NodeJS_CHECKSUM_DATA} ${NodeJS_WIN32_LIBRARY_PATH} 
            NodeJS_WIN32_LIBRARY_CHECKSUM
        )
        nodejs_download(
            ${NodeJS_URL}/${NodeJS_WIN32_LIBRARY_PATH}
            ${NodeJS_WIN32_LIBRARY_FILE}
            ${NodeJS_WIN32_LIBRARY_CHECKSUM}
            ${NodeJS_CHECKSUM_TYPE}
            ${NodeJS_FORCE_DOWNLOAD}
        )

        # If provided, download the windows executable
        if(NodeJS_WIN32_BINARY_PATH AND 
            NodeJS_DOWNLOAD_EXECUTABLE)
            set(NodeJS_WIN32_BINARY_FILE 
                ${NodeJS_DOWNLOAD_PATH}/lib/${NodeJS_ARCH}
            )
            set(NodeJS_WIN32_BINARY_FILE 
                ${NodeJS_WIN32_BINARY_FILE}/${NodeJS_WIN32_BINARY_NAME}
            )
            nodejs_checksum(
                ${NodeJS_CHECKSUM_DATA} ${NodeJS_WIN32_BINARY_PATH} 
                NodeJS_WIN32_BINARY_CHECKSUM
            )
            nodejs_download(
                ${NodeJS_URL}/${NodeJS_WIN32_BINARY_PATH}
                ${NodeJS_WIN32_BINARY_FILE}
                ${NodeJS_WIN32_BINARY_CHECKSUM}
                ${NodeJS_CHECKSUM_TYPE}
                ${NodeJS_FORCE_DOWNLOAD}
            )
        endif()
    endif()
endif()

# Find and include the Nan package
nodejs_find_module_fallback(nan ${CMAKE_CURRENT_SOURCE_DIR} NodeJS_NAN_PATH)
list(APPEND NodeJS_INCLUDE_DIRS ${NodeJS_NAN_PATH})

# This is a find_package file, handle the standard invocation
include(FindPackageHandleStandardArgs)
set(NodeJS_TARGET "${NodeJS_PLATFORM}/${NodeJS_ARCH}")
find_package_handle_standard_args(NodeJS
    FOUND_VAR NodeJS_FOUND
    REQUIRED_VARS NodeJS_TARGET NodeJS_INCLUDE_DIRS NodeJS_NAN_PATH
    VERSION_VAR NodeJS_VERSION
)

mark_as_advanced(
    NodeJS_VALIDATE_EXECUTABLE
    NodeJS_OTHER_COMPONENTS
    NodeJS_COMPONENTS_CONTAINS_VARIANT
    NodeJS_COMPONENT
    NodeJS_OTHER_INDEX
    NodeJS_PLATFORM
    NodeJS_PLATFORM_WIN32
    NodeJS_PLATFORM_LINUX
    NodeJS_PLATFORM_DARWIN
    NodeJS_ARCH
    NodeJS_ARCH_X64
    NodeJS_ARCH_IA32
    NodeJS_ARCH_ARM
    NodeJS_VARIANT_BASE
    NodeJS_VARIANT_NAME
    NodeJS_URL
    NodeJS_SOURCE_PATH
    NodeJS_CHECKSUM_PATH
    NodeJS_CHECKSUM_TYPE
    NodeJS_WIN32_LIBRARY_PATH
    NodeJS_WIN32_BINARY_PATH
    NodeJS_INCLUDE_PATHS
    NodeJS_WIN32_LIBRARY_NAME
    NodeJS_WIN32_BINARY_NAME
    NodeJS_DOWNLOAD_PATH
    NodeJS_CHECKSUM_FILE
    NodeJS_CHECKSUM_DATA
    NodeJS_SOURCE_FILE
    NodeJS_SOURCE_CHECKSUM
    NodeJS_HEADER_PATH
    NodeJS_HEADER_BASE
    NodeJS_INCLUDE_DIR
    NodeJS_WIN32_LIBRARY_FILE
    NodeJS_WIN32_LIBRARY_CHECKSUM
    NodeJS_WIN32_BINARY_FILE
    NodeJS_WIN32_BINARY_CHECKSUM
    NodeJS_NAN_PATH
    NodeJS_TARGET
)
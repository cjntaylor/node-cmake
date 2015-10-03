set(NodeJS_DEFAULT_VARIANT "Node.js")
set(NodeJS_VARIANT_NAME ${NodeJS_DEFAULT_VARIANT})
set(NodeJS_VARIANT_BASE "node")
set(NodeJS_URL "http://nodejs.org/dist/${NodeJS_VERSION_STRING}")

# For Node.js >= 4.0.0, use the headers archive
set(NodeJS_SOURCE_PATH "node-${NodeJS_VERSION_STRING}")
list(APPEND NodeJS_INCLUDE_PATHS
    src
    deps/uv/include
    deps/v8/include
    deps/openssl/openssl/include
    deps/zlib
)
if(NodeJS_VERSION_MAJOR GREATER 0)
    set(NodeJS_SOURCE_PATH "${NodeJS_SOURCE_PATH}-headers")
    set(NodeJS_INCLUDE_PATHS include/node)
endif()
set(NodeJS_SOURCE_PATH "${NodeJS_SOURCE_PATH}.tar.gz")

# Use SHA256 when available
set(NodeJS_CHECKSUM_PATH "SHASUMS")
if(NodeJS_VERSION_MAJOR GREATER 0 OR NodeJS_VERSION_MINOR GREATER 7)
    set(NodeJS_CHECKSUM_PATH "${NodeJS_CHECKSUM_PATH}256")
    set(NodeJS_CHECKSUM_TYPE "SHA256")
else()
    set(NodeJS_CHECKSUM_TYPE "SHA1")
endif()
set(NodeJS_CHECKSUM_PATH "${NodeJS_CHECKSUM_PATH}.txt")

# The library and executable locations moved after version 4
if(NodeJS_VERSION_MAJOR GREATER 0)
    set(NodeJS_WIN32_LIBRARY_PATH "win-")
    set(NodeJS_WIN32_BINARY_PATH "win-")
    if(NodeJS_ARCH_IA32)
        set(NodeJS_WIN32_LIBRARY_PATH "${NodeJS_WIN32_LIBRARY_PATH}x86/")
        set(NodeJS_WIN32_BINARY_PATH "${NodeJS_WIN32_BINARY_PATH}x86/")
    endif()
endif()

# 64-bit versions are prefixed
if(NodeJS_ARCH_X64)
    set(NodeJS_WIN32_LIBRARY_PATH "${NodeJS_WIN32_LIBRARY_PATH}x64/")
    set(NodeJS_WIN32_BINARY_PATH "${NodeJS_WIN32_BINARY_PATH}x64/")
endif()

# Library and binary are based on variant base
set(NodeJS_WIN32_LIBRARY_PATH 
    "${NodeJS_WIN32_LIBRARY_PATH}${NodeJS_VARIANT_BASE}.lib"
)
set(NodeJS_WIN32_BINARY_PATH 
    "${NodeJS_WIN32_BINARY_PATH}${NodeJS_VARIANT_BASE}.exe"
)

# Specify windows libraries
# XXX: This may need to be version/variant specific in the future
if(NodeJS_PLATFORM_WIN32)
    list(APPEND NodeJS_LIBRARIES
        kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib
        advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib
        odbc32.lib DelayImp.lib
    )
endif()
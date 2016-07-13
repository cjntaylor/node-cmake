/*
 * When this file is linked to a DLL, it sets up a delay-load hook that
 * intervenes when the DLL is trying to load the main node binary
 * dynamically. Instead of trying to locate the .exe file it'll just return
 * a handle to the process image.
 *
 * This allows compiled addons to work when node.exe or iojs.exe is renamed.
 */

#ifdef _MSC_VER

#define DELAYIMP_INSECURE_WRITABLE_HOOKS
#define WIN32_LEAN_AND_MEAN
#include <windows.h>

#include <delayimp.h>
#include <string.h>

static FARPROC WINAPI load_exe_hook(unsigned int event, DelayLoadInfo* info) {
  HMODULE m;
  
  /* Function is called multiple times, only handle the preload invocation */
  if(event != dliNotePreLoadLibrary) return NULL;

  /* Only return the process image for known executable names */
  if(@NodeJS_WIN32_DELAYLOAD_CONDITION@) return NULL;

  /* Return a handle to the process image */
  m = GetModuleHandle(NULL);
  return (FARPROC) m;
}

PfnDliHook __pfnDliNotifyHook2 = load_exe_hook;

#endif

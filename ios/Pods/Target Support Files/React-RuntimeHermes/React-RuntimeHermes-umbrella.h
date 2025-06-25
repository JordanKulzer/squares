#ifdef __OBJC__
#import <UIKit/UIKit.h>
#else
#ifndef FOUNDATION_EXPORT
#if defined(__cplusplus)
#define FOUNDATION_EXPORT extern "C"
#else
#define FOUNDATION_EXPORT extern
#endif
#endif
#endif

#import "react/runtime/hermes/HermesInstance.h"

FOUNDATION_EXPORT double react_runtime_hermesVersionNumber;
FOUNDATION_EXPORT const unsigned char react_runtime_hermesVersionString[];


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

#import "react/renderer/mapbuffer/MapBuffer.h"
#import "react/renderer/mapbuffer/MapBufferBuilder.h"

FOUNDATION_EXPORT double react_renderer_mapbufferVersionNumber;
FOUNDATION_EXPORT const unsigned char react_renderer_mapbufferVersionString[];


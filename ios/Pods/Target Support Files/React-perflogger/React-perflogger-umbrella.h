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

#import "reactperflogger/BridgeNativeModulePerfLogger.h"
#import "reactperflogger/FuseboxPerfettoDataSource.h"
#import "reactperflogger/HermesPerfettoDataSource.h"
#import "reactperflogger/NativeModulePerfLogger.h"
#import "reactperflogger/ReactPerfetto.h"
#import "reactperflogger/ReactPerfettoCategories.h"
#import "reactperflogger/ReactPerfettoLogger.h"
#import "reactperflogger/FuseboxTracer.h"

FOUNDATION_EXPORT double reactperfloggerVersionNumber;
FOUNDATION_EXPORT const unsigned char reactperfloggerVersionString[];


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

#import "RCTAnimation/RCTAnimationDriver.h"
#import "RCTAnimation/RCTDecayAnimation.h"
#import "RCTAnimation/RCTEventAnimation.h"
#import "RCTAnimation/RCTFrameAnimation.h"
#import "RCTAnimation/RCTSpringAnimation.h"
#import "RCTAnimation/RCTAdditionAnimatedNode.h"
#import "RCTAnimation/RCTAnimatedNode.h"
#import "RCTAnimation/RCTColorAnimatedNode.h"
#import "RCTAnimation/RCTDiffClampAnimatedNode.h"
#import "RCTAnimation/RCTDivisionAnimatedNode.h"
#import "RCTAnimation/RCTInterpolationAnimatedNode.h"
#import "RCTAnimation/RCTModuloAnimatedNode.h"
#import "RCTAnimation/RCTMultiplicationAnimatedNode.h"
#import "RCTAnimation/RCTObjectAnimatedNode.h"
#import "RCTAnimation/RCTPropsAnimatedNode.h"
#import "RCTAnimation/RCTStyleAnimatedNode.h"
#import "RCTAnimation/RCTSubtractionAnimatedNode.h"
#import "RCTAnimation/RCTTrackingAnimatedNode.h"
#import "RCTAnimation/RCTTransformAnimatedNode.h"
#import "RCTAnimation/RCTValueAnimatedNode.h"
#import "RCTAnimation/RCTAnimationPlugins.h"
#import "RCTAnimation/RCTAnimationUtils.h"
#import "RCTAnimation/RCTNativeAnimatedModule.h"
#import "RCTAnimation/RCTNativeAnimatedNodesManager.h"
#import "RCTAnimation/RCTNativeAnimatedTurboModule.h"

FOUNDATION_EXPORT double RCTAnimationVersionNumber;
FOUNDATION_EXPORT const unsigned char RCTAnimationVersionString[];


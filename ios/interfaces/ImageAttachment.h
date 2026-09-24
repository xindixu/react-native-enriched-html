#import "ImageData.h"
#import "MediaAttachment.h"

@interface ImageAttachment : MediaAttachment

@property(nonatomic, strong) ImageData *imageData;
@property(nonatomic, strong) UIImage *storedAnimatedImage;
@property(nonatomic, assign) BOOL loadFailed;

- (instancetype)initWithImageData:(ImageData *)data;

@end

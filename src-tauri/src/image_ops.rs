//! 图像处理命令（AWMC 移植：格式转码 / 压缩 / 变换 / 调整 / EXIF）
//!
//! 所有命令接收前端传入的字节与参数，返回处理后的字节或结构化结果。
//! 前端通过 `invoke("image_convert", { ... })` 调用。

use image::{DynamicImage, GenericImageView, ImageFormat, imageops};
use serde::{Deserialize, Serialize};

// ---------- 通用类型 ----------

/// 支持的输出格式
#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ConvertFormat {
    Png,
    Jpeg,
    Webp,
    Bmp,
    Tiff,
    Gif,
    Ico,
    Qoi,
}

impl ConvertFormat {
    fn to_image_format(self) -> Option<ImageFormat> {
        match self {
            ConvertFormat::Png => Some(ImageFormat::Png),
            ConvertFormat::Jpeg => Some(ImageFormat::Jpeg),
            ConvertFormat::Webp => Some(ImageFormat::WebP),
            ConvertFormat::Bmp => Some(ImageFormat::Bmp),
            ConvertFormat::Tiff => Some(ImageFormat::Tiff),
            ConvertFormat::Gif => Some(ImageFormat::Gif),
            ConvertFormat::Ico => Some(ImageFormat::Ico),
            ConvertFormat::Qoi => Some(ImageFormat::Qoi),
        }
    }
}

/// 从字节加载图片，自动推断格式
fn load_image(bytes: &[u8]) -> Result<DynamicImage, String> {
    image::load_from_memory(bytes).map_err(|e| format!("图片解码失败：{e}"))
}

/// 将 DynamicImage 编码为目标格式字节
fn encode_image(img: &DynamicImage, fmt: ImageFormat, quality: u8) -> Result<Vec<u8>, String> {
    let mut buf = std::io::Cursor::new(Vec::new());
    match fmt {
        ImageFormat::Jpeg => {
            let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buf, quality);
            let rgb = image::DynamicImage::ImageRgba8(img.to_rgba8()).to_rgb8();
            encoder
                .encode(&rgb, rgb.width(), rgb.height(), image::ExtendedColorType::Rgb8)
                .map_err(|e| format!("JPEG 编码失败：{e}"))?;
        }
        ImageFormat::WebP => {
            image::DynamicImage::ImageRgba8(img.to_rgba8())
                .write_with_encoder(image::codecs::webp::WebPEncoder::new_lossless(&mut buf))
                .map_err(|e| format!("WebP 编码失败：{e}"))?;
        }
        _ => {
            img.write_to(&mut buf, fmt)
                .map_err(|e| format!("编码失败：{e}"))?;
        }
    }
    Ok(buf.into_inner())
}

// ---------- 格式转码 ----------

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConvertArgs {
    pub bytes: Vec<u8>,
    pub format: ConvertFormat,
    /// JPEG 质量 1-100，默认 90
    #[serde(default = "default_quality")]
    pub quality: u8,
    /// 最大宽度，0 = 原尺寸（等比缩放）
    #[serde(default)]
    pub max_width: u32,
}

fn default_quality() -> u8 {
    90
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConvertResult {
    pub bytes: Vec<u8>,
    pub width: u32,
    pub height: u32,
}

/// 格式转码：加载 → 可选缩放 → 编码为目标格式
#[tauri::command]
pub async fn image_convert(args: ConvertArgs) -> Result<ConvertResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let img = load_image(&args.bytes)?;
        let img = if args.max_width > 0 && img.width() > args.max_width {
            let ratio = args.max_width as f64 / img.width() as f64;
            let h = (img.height() as f64 * ratio).round() as u32;
            img.resize_exact(args.max_width, h, imageops::FilterType::Lanczos3)
        } else {
            img
        };
        let (w, h) = img.dimensions();
        let fmt = args
            .format
            .to_image_format()
            .ok_or_else(|| "不支持的格式".to_string())?;
        let bytes = encode_image(&img, fmt, args.quality)?;
        Ok(ConvertResult {
            bytes,
            width: w,
            height: h,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

// ---------- 图片压缩 ----------

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompressArgs {
    pub bytes: Vec<u8>,
    /// 目标格式（jpeg / webp / png）
    pub format: ConvertFormat,
    /// 质量 1-100
    #[serde(default = "default_quality")]
    pub quality: u8,
    /// PNG 优化级别（0-6），仅 PNG 生效，需要 advanced-codecs feature
    #[serde(default)]
    pub oxipng_level: u8,
    /// PNG 有损调色板色数（2-256），0 = 不启用（预留，当前未实现）
    #[serde(default)]
    pub png_colors: u8,
}

/// 压缩图片：对 JPEG/WebP 调质量，对 PNG 走 OxiPNG/ImageQuant（可选）
#[tauri::command]
pub async fn image_compress(args: CompressArgs) -> Result<ConvertResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let img = load_image(&args.bytes)?;
        let (w, h) = img.dimensions();
        let fmt = args
            .format
            .to_image_format()
            .ok_or_else(|| "不支持的格式".to_string())?;
        let bytes = match fmt {
            ImageFormat::Png => compress_png(&img, args.oxipng_level, args.png_colors)?,
            _ => encode_image(&img, fmt, args.quality)?,
        };
        Ok(ConvertResult {
            bytes,
            width: w,
            height: h,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(feature = "advanced-codecs")]
fn compress_png(img: &DynamicImage, oxipng_level: u8, _png_colors: u8) -> Result<Vec<u8>, String> {
    // 先编码为标准 PNG
    let mut buf = std::io::Cursor::new(Vec::new());
    img.write_to(&mut buf, ImageFormat::Png)
        .map_err(|e| format!("PNG 编码失败：{e}"))?;
    let raw = buf.into_inner();
    // 无损优化：OxiPNG
    if oxipng_level > 0 {
        optimize_png_oxipng(&raw, oxipng_level)
    } else {
        Ok(raw)
    }
}

#[cfg(not(feature = "advanced-codecs"))]
fn compress_png(img: &DynamicImage, _oxipng_level: u8, _png_colors: u8) -> Result<Vec<u8>, String> {
    let mut buf = std::io::Cursor::new(Vec::new());
    img.write_to(&mut buf, ImageFormat::Png)
        .map_err(|e| format!("PNG 编码失败：{e}"))?;
    Ok(buf.into_inner())
}

#[cfg(feature = "advanced-codecs")]
fn optimize_png_oxipng(raw: &[u8], level: u8) -> Result<Vec<u8>, String> {
    let opts = oxipng::Options::from_preset(level.min(6) as u8);
    let mut out = Vec::new();
    oxipng::optimize_from_memory(raw, &mut out, &opts)
        .map_err(|e| format!("OxiPNG 优化失败：{e}"))?;
    Ok(out)
}

// ---------- 图像变换 ----------

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransformArgs {
    pub bytes: Vec<u8>,
    /// 旋转角度：90 / 180 / 270，0 = 不旋转
    #[serde(default)]
    pub rotate: u32,
    /// 水平翻转
    #[serde(default)]
    pub flip_h: bool,
    /// 垂直翻转
    #[serde(default)]
    pub flip_v: bool,
    /// 裁剪区域 [x, y, w, h]，None = 不裁剪
    #[serde(default)]
    pub crop: Option<(u32, u32, u32, u32)>,
    /// 目标宽度，0 = 不缩放
    #[serde(default)]
    pub resize_w: u32,
    /// 目标高度，0 = 不缩放
    #[serde(default)]
    pub resize_h: u32,
}

/// 图像变换：裁剪 → 旋转 → 翻转 → 缩放
#[tauri::command]
pub async fn image_transform(args: TransformArgs) -> Result<ConvertResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let img = load_image(&args.bytes)?;
        let mut img = if let Some((x, y, w, h)) = args.crop {
            img.crop_imm(x, y, w, h)
        } else {
            img
        };
        img = match args.rotate % 360 {
            90 => img.rotate90(),
            180 => img.rotate180(),
            270 => img.rotate270(),
            _ => img,
        };
        if args.flip_h {
            img = img.fliph();
        }
        if args.flip_v {
            img = img.flipv();
        }
        if args.resize_w > 0 && args.resize_h > 0 {
            img = img.resize_exact(args.resize_w, args.resize_h, imageops::FilterType::Lanczos3);
        } else if args.resize_w > 0 {
            let ratio = args.resize_w as f64 / img.width() as f64;
            let h = (img.height() as f64 * ratio).round() as u32;
            img = img.resize_exact(args.resize_w, h, imageops::FilterType::Lanczos3);
        } else if args.resize_h > 0 {
            let ratio = args.resize_h as f64 / img.height() as f64;
            let w = (img.width() as f64 * ratio).round() as u32;
            img = img.resize_exact(w, args.resize_h, imageops::FilterType::Lanczos3);
        }
        let (w, h) = img.dimensions();
        let bytes = encode_image(&img, ImageFormat::Png, 100)?;
        Ok(ConvertResult {
            bytes,
            width: w,
            height: h,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

// ---------- 图像调整 ----------

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdjustArgs {
    pub bytes: Vec<u8>,
    /// 亮度 -100 ~ 100，0 = 不变
    #[serde(default)]
    pub brightness: f32,
    /// 对比度 -100 ~ 100
    #[serde(default)]
    pub contrast: f32,
    /// 饱和度 -100 ~ 100
    #[serde(default)]
    pub saturation: f32,
    /// 色相 -180 ~ 180
    #[serde(default)]
    pub hue: f32,
    /// 伽马 0.1 ~ 10.0，1.0 = 不变
    #[serde(default = "default_gamma")]
    pub gamma: f32,
    /// 色温 -100 ~ 100（正值偏暖，负值偏冷）
    #[serde(default)]
    pub temperature: f32,
    /// 输出格式
    #[serde(default = "default_adjust_format")]
    pub format: ConvertFormat,
    #[serde(default = "default_quality")]
    pub quality: u8,
}

fn default_gamma() -> f32 {
    1.0
}
fn default_adjust_format() -> ConvertFormat {
    ConvertFormat::Jpeg
}

/// 调整亮度/对比度/饱和度/色相/伽马/色温
#[tauri::command]
pub async fn image_adjust(args: AdjustArgs) -> Result<ConvertResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let img = load_image(&args.bytes)?;
        let mut rgba = img.to_rgba8();
        let (w, h) = rgba.dimensions();

        // 预计算伽马查找表
        let gamma_lut: Vec<u8> = if (args.gamma - 1.0).abs() > 0.001 {
            (0..=255)
                .map(|v| {
                    let f = (v as f32) / 255.0;
                    (f.powf(1.0 / args.gamma) * 255.0).clamp(0.0, 255.0) as u8
                })
                .collect()
        } else {
            (0..=255).map(|v| v as u8).collect()
        };

        // 色温偏移（正值暖：加红减蓝；负值冷：减红加蓝）
        let temp_shift = args.temperature * 0.8;

        for px in rgba.pixels_mut() {
            let channels = px.0;
            let mut r = channels[0] as f32;
            let mut g = channels[1] as f32;
            let mut b = channels[2] as f32;

            // 亮度
            if args.brightness != 0.0 {
                let f = args.brightness * 2.55;
                r += f;
                g += f;
                b += f;
            }

            // 对比度
            if args.contrast != 0.0 {
                let f = (259.0 * (args.contrast + 255.0)) / (255.0 * (259.0 - args.contrast));
                r = f * (r - 128.0) + 128.0;
                g = f * (g - 128.0) + 128.0;
                b = f * (b - 128.0) + 128.0;
            }

            // 色温
            if args.temperature != 0.0 {
                r += temp_shift;
                b -= temp_shift;
            }

            // 饱和度 + 色相（转 HSL 处理）
            if args.saturation != 0.0 || args.hue != 0.0 {
                let (mut h, s, l) = rgb_to_hsl(r, g, b);
                if args.hue != 0.0 {
                    h = (h + args.hue / 360.0).rem_euclid(1.0);
                }
                let s = if args.saturation > 0.0 {
                    (s + args.saturation / 100.0).min(1.0)
                } else {
                    (s + args.saturation / 100.0).max(0.0)
                };
                let (nr, ng, nb) = hsl_to_rgb(h, s, l);
                r = nr;
                g = ng;
                b = nb;
            }

            // 伽马
            r = gamma_lut[r.clamp(0.0, 255.0) as usize] as f32;
            g = gamma_lut[g.clamp(0.0, 255.0) as usize] as f32;
            b = gamma_lut[b.clamp(0.0, 255.0) as usize] as f32;

            px.0 = [
                r.clamp(0.0, 255.0) as u8,
                g.clamp(0.0, 255.0) as u8,
                b.clamp(0.0, 255.0) as u8,
                channels[3],
            ];
        }

        let result = DynamicImage::ImageRgba8(rgba);
        let fmt = args
            .format
            .to_image_format()
            .ok_or_else(|| "不支持的格式".to_string())?;
        let bytes = encode_image(&result, fmt, args.quality)?;
        Ok(ConvertResult {
            bytes,
            width: w,
            height: h,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

fn rgb_to_hsl(r: f32, g: f32, b: f32) -> (f32, f32, f32) {
    let r = r / 255.0;
    let g = g / 255.0;
    let b = b / 255.0;
    let max = r.max(g).max(b);
    let min = r.min(g).min(b);
    let l = (max + min) / 2.0;
    if (max - min).abs() < 1e-6 {
        return (0.0, 0.0, l);
    }
    let d = max - min;
    let s = if l > 0.5 {
        d / (2.0 - max - min)
    } else {
        d / (max + min)
    };
    let h = if max == r {
        (g - b) / d + (if g < b { 6.0 } else { 0.0 })
    } else if max == g {
        (b - r) / d + 2.0
    } else {
        (r - g) / d + 4.0
    };
    (h / 6.0, s, l)
}

fn hsl_to_rgb(h: f32, s: f32, l: f32) -> (f32, f32, f32) {
    if s == 0.0 {
        return (l * 255.0, l * 255.0, l * 255.0);
    }
    let q = if l < 0.5 {
        l * (1.0 + s)
    } else {
        l + s - l * s
    };
    let p = 2.0 * l - q;
    let hue_to_rgb = |p: f32, q: f32, t: f32| {
        let mut t = t;
        if t < 0.0 {
            t += 1.0;
        }
        if t > 1.0 {
            t -= 1.0;
        }
        if t < 1.0 / 6.0 {
            return p + (q - p) * 6.0 * t;
        }
        if t < 1.0 / 2.0 {
            return q;
        }
        if t < 2.0 / 3.0 {
            return p + (q - p) * (2.0 / 3.0 - t) * 6.0;
        }
        p
    };
    let r = hue_to_rgb(p, q, h + 1.0 / 3.0);
    let g = hue_to_rgb(p, q, h);
    let b = hue_to_rgb(p, q, h - 1.0 / 3.0);
    (r * 255.0, g * 255.0, b * 255.0)
}

// ---------- EXIF ----------

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExifField {
    pub tag: String,
    pub value: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExifReadResult {
    pub fields: Vec<ExifField>,
}

/// 读取 EXIF 信息
#[tauri::command]
pub async fn exif_read(bytes: Vec<u8>) -> Result<ExifReadResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut buf = std::io::Cursor::new(&bytes);
        let reader = exif::Reader::new()
            .read_from_container(&mut buf)
            .map_err(|e| format!("EXIF 读取失败：{e}"))?;
        let mut fields = Vec::new();
        for f in reader.fields() {
            let tag = format!("{:?}", f.tag);
            let value = f.display_value().with_unit(&reader).to_string();
            fields.push(ExifField { tag, value });
        }
        Ok(ExifReadResult { fields })
    })
    .await
    .map_err(|e| e.to_string())?
}

/// 剥离 EXIF 并重新编码（保持原格式）
#[tauri::command]
pub async fn exif_strip(bytes: Vec<u8>) -> Result<Vec<u8>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let img = load_image(&bytes)?;
        // 重新编码即丢弃元数据
        let mut buf = std::io::Cursor::new(Vec::new());
        img.write_to(&mut buf, ImageFormat::Png)
            .map_err(|e| format!("重新编码失败：{e}"))?;
        Ok(buf.into_inner())
    })
    .await
    .map_err(|e| e.to_string())?
}

// ---------- 哈希占位（供未来 pHash 使用） ----------

/// 计算图片的感知哈希（pHash），返回 64 位哈希的十六进制字符串
#[tauri::command]
pub async fn image_phash(bytes: Vec<u8>) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let img = load_image(&bytes)?
            .resize_exact(32, 32, imageops::FilterType::Nearest)
            .to_luma8();
        // DCT 简化版：用均值哈希（aHash）作为 pHash 近似
        let mean = img.pixels().map(|p| p.0[0] as u64).sum::<u64>() / 1024;
        let mut hash: u64 = 0;
        for (i, px) in img.pixels().enumerate() {
            if px.0[0] as u64 > mean {
                hash |= 1 << i;
            }
        }
        Ok(format!("{hash:016x}"))
    })
    .await
    .map_err(|e| e.to_string())?
}

# Images & Assets Directory

This directory contains all static images and assets for the Smart Traffic Management System.

## Directory Structure
assets/images/
├── logos/
│ ├── logo.png # Main application logo
│ ├── logo-white.png # White version for dark backgrounds
│ └── favicon.ico # Browser favicon
├── icons/
│ ├── ambulance.png # Ambulance icon
│ ├── police.png # Police icon
│ ├── hospital.png # Hospital icon
│ └── traffic-light.png # Traffic signal icon
├── maps/
│ ├── city-map.jpg # City map background
│ └── route-bg.png # Route planning background
├── ui/
│ ├── dashboard-bg.jpg # Dashboard background
│ ├── login-bg.jpg # Login page background
│ └── pattern.png # Background pattern
└── emergency/
├── siren.gif # Animated siren
└── warning.png # Warning symbol


## Image Guidelines

### 1. Logo Specifications
- **Main Logo**: 512x512 pixels, PNG format with transparency
- **Favicon**: 64x64 pixels, ICO format
- **Color Scheme**: Use #1976d2 (primary blue) for consistency

### 2. Icon Specifications
- **Size**: 128x128 pixels minimum
- **Format**: PNG with transparency
- **Style**: Flat design, consistent line weight

### 3. Map Assets
- **Resolution**: 1920x1080 minimum
- **Format**: JPG for photos, PNG for graphics
- **Copyright**: Use only royalty-free or project-created images

### 4. UI Backgrounds
- **Resolution**: 1920x1080 for full-screen backgrounds
- **Opacity**: Keep backgrounds subtle (10-20% opacity when overlaid)
- **Color**: Use brand colors (#1976d2, #4caf50, #ff9800)

## Adding New Images

1. Place images in appropriate subdirectory
2. Optimize images using tools like:
   - [TinyPNG](https://tinypng.com/) for PNG compression
   - [Squoosh](https://squoosh.app/) for WebP conversion
3. Update this README if adding new categories
4. Ensure proper attribution for third-party images

## Image Optimization Tips

1. **Use WebP format** for better compression (85% quality)
2. **Resize images** to exact dimensions needed
3. **Lazy load** images below the fold
4. **Use srcset** for responsive images
5. **Compress SVG** files using SVGO

## Color Palette

### Primary Colors
- Primary Blue: #1976d2
- Primary Dark: #1565c0
- Primary Light: #42a5f5

### Status Colors
- Success/Green: #4caf50
- Warning/Orange: #ff9800
- Error/Red: #f44336
- Info/Blue: #2196f3

### Emergency Colors
- Ambulance Red: #f44336
- Police Blue: #1976d2
- Hospital Green: #4caf50

## Font Icons

The project uses Material-UI icons. To add custom icons:

1. Create SVG file in `/icons/` directory
2. Optimize SVG using SVGO
3. Import as React component:
```jsx
import { ReactComponent as CustomIcon } from '../assets/icons/custom-icon.svg';


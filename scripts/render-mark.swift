#!/usr/bin/env swift
import AppKit
import Foundation

let size = CommandLine.arguments.count > 1 ? (Int(CommandLine.arguments[1]) ?? 32) : 32
let outPath = CommandLine.arguments.count > 2
  ? CommandLine.arguments[2]
  : "apps/web/public/favicon.png"

guard let rep = NSBitmapImageRep(
  bitmapDataPlanes: nil,
  pixelsWide: size,
  pixelsHigh: size,
  bitsPerSample: 8,
  samplesPerPixel: 4,
  hasAlpha: true,
  isPlanar: false,
  colorSpaceName: .deviceRGB,
  bytesPerRow: 0,
  bitsPerPixel: 0
) else { fputs("bitmap\n", stderr); exit(1) }
rep.size = NSSize(width: size, height: size)
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)

let S = CGFloat(size)
let ink = NSColor(calibratedWhite: 0.96, alpha: 1)
let voidC = NSColor(calibratedRed: 0.039, green: 0.047, blue: 0.055, alpha: 1)

voidC.setFill()
NSBezierPath(roundedRect: NSRect(x: 0, y: 0, width: S, height: S), xRadius: S * 0.22, yRadius: S * 0.22).fill()

ink.setFill()

func pill(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat) {
  // y from top in unit space
  let r = NSRect(x: x * S, y: (1 - y - h) * S, width: w * S, height: h * S)
  NSBezierPath(roundedRect: r, xRadius: min(r.width, r.height) / 2, yRadius: min(r.width, r.height) / 2).fill()
}
func dot(_ cx: CGFloat, _ cy: CGFloat, _ r: CGFloat) {
  let rect = NSRect(x: (cx - r) * S, y: (1 - cy - r) * S, width: 2 * r * S, height: 2 * r * S)
  NSBezierPath(ovalIn: rect).fill()
}

// Frame — designer modular layout (unit coords)
pill(0.09, 0.11, 0.135, 0.28)
dot(0.157, 0.48, 0.05)
pill(0.09, 0.56, 0.135, 0.26)
dot(0.34, 0.155, 0.05)
pill(0.42, 0.11, 0.40, 0.12)
dot(0.845, 0.28, 0.05)
pill(0.78, 0.36, 0.135, 0.28)
dot(0.845, 0.78, 0.05)
pill(0.28, 0.74, 0.42, 0.12)

// Central S via heavy rounded type — readable at 16–32px
let fontSize = S * 0.42
let font = NSFont.systemFont(ofSize: fontSize, weight: .black)
let para = NSMutableParagraphStyle()
para.alignment = .center
let attrs: [NSAttributedString.Key: Any] = [
  .font: font,
  .foregroundColor: ink,
  .paragraphStyle: para,
]
let sRect = NSRect(x: S * 0.22, y: S * 0.26, width: S * 0.56, height: S * 0.48)
("S" as NSString).draw(in: sRect, withAttributes: attrs)

NSGraphicsContext.current = nil
guard let data = rep.representation(using: .png, properties: [:]) else { exit(1) }
try data.write(to: URL(fileURLWithPath: outPath))
print("wrote \(size)×\(size) → \(outPath)")

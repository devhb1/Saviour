import AppKit

let outPath = CommandLine.arguments.count > 1
  ? CommandLine.arguments[1]
  : "apps/web/public/og.png"
let markPath = CommandLine.arguments.count > 2
  ? CommandLine.arguments[2]
  : "apps/web/public/brand/saviours-mark-glow.png"

guard let mark = NSImage(contentsOfFile: markPath) else {
  fputs("missing mark: \(markPath)\n", stderr)
  exit(1)
}

let W: CGFloat = 1200
let H: CGFloat = 630
let out = NSImage(size: NSSize(width: W, height: H))
out.lockFocus()

NSColor(calibratedRed: 0.03, green: 0.04, blue: 0.08, alpha: 1).setFill()
NSBezierPath.fill(NSRect(x: 0, y: 0, width: W, height: H))

let mw: CGFloat = 340
let mh: CGFloat = 340
mark.draw(
  in: NSRect(x: 64, y: (H - mh) / 2, width: mw, height: mh),
  from: .zero,
  operation: .sourceOver,
  fraction: 1
)

let titleAttrs: [NSAttributedString.Key: Any] = [
  .font: NSFont.systemFont(ofSize: 72, weight: .semibold),
  .foregroundColor: NSColor.white,
  .kern: -1.5,
]
let subAttrs: [NSAttributedString.Key: Any] = [
  .font: NSFont.monospacedSystemFont(ofSize: 22, weight: .regular),
  .foregroundColor: NSColor(white: 0.72, alpha: 1),
]
let chipAttrs: [NSAttributedString.Key: Any] = [
  .font: NSFont.monospacedSystemFont(ofSize: 16, weight: .medium),
  .foregroundColor: NSColor(calibratedRed: 0.3, green: 0.85, blue: 0.9, alpha: 1),
]

("saviours" as NSString).draw(at: NSPoint(x: 440, y: 320), withAttributes: titleAttrs)
("Investigate once · Name forever · Resolve for $0" as NSString)
  .draw(at: NSPoint(x: 440, y: 260), withAttributes: subAttrs)
("WATCH / TAINTED · ENS memory · Graph evidence" as NSString)
  .draw(at: NSPoint(x: 440, y: 210), withAttributes: chipAttrs)

out.unlockFocus()

guard
  let tiff = out.tiffRepresentation,
  let rep = NSBitmapImageRep(data: tiff),
  let data = rep.representation(using: .png, properties: [:])
else {
  fputs("png encode failed\n", stderr)
  exit(1)
}

try data.write(to: URL(fileURLWithPath: outPath))
print("og written \(data.count) → \(outPath)")

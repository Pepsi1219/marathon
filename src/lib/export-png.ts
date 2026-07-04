import { toPng } from "html-to-image";

/** Renders a DOM node to a PNG and triggers a download. */
export async function exportNodeToPng(node: HTMLElement, filename: string) {
  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
    // The sheet paints its own background; make sure transparent areas aren't black.
    backgroundColor: "#ffffff",
  });
  const link = document.createElement("a");
  link.download = filename.endsWith(".png") ? filename : `${filename}.png`;
  link.href = dataUrl;
  link.click();
}

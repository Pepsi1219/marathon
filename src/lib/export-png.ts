import { toPng } from "html-to-image";

export async function exportNodeToPng(node: HTMLElement, filename: string) {
  const name = filename.endsWith(".png") ? filename : `${filename}.png`;
  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: "#ffffff",
  });

  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], name, { type: "image/png" });

  // On mobile, use the share sheet so the user can save directly to Photos.
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] });
    return;
  }

  // Desktop fallback: trigger a download.
  const link = document.createElement("a");
  link.download = name;
  link.href = dataUrl;
  link.click();
}

// 逐帧导出：把舞台渲染成图片（DOM → SVG foreignObject → canvas），POST 给 export_server.py。
// 在页面里加载本文件后调用 exportFrames(from, to, fps)；帧号 i 对应时刻 i / fps 秒。
// 输出 1920×1080（16:9）JPEG。
(() => {
  const W = 1280;
  const H = 720;
  const SCALE = 1.5;
  let css = null;

  async function inlineCSS() {
    if (css) return css;
    const bytes = new Uint8Array(await (await fetch("fonts/inter-latin.woff2")).arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    const source = document.querySelector("style").textContent;
    css = source.replace('url("fonts/inter-latin.woff2")', `url("data:font/woff2;base64,${btoa(bin)}")`);
    if (css === source) throw new Error("font URL not found in the page CSS");
    return css;
  }

  // 同步取一帧的快照；之后的解码和编码可以并行
  function frameSVG(t) {
    window.replay.seek(t);
    const clone = document.getElementById("stage").cloneNode(true);
    clone.style.transform = "none";
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`
      + `<foreignObject x="0" y="0" width="${W}" height="${H}">`
      + `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${W}px;height:${H}px">`
      + `<style>${css}</style>${new XMLSerializer().serializeToString(clone)}</div></foreignObject></svg>`;
  }

  async function rasterize(svg) {
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = W * SCALE;
    canvas.height = H * SCALE;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#05070a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(SCALE, SCALE);
    ctx.drawImage(img, 0, 0);
    return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.95));
  }

  window.renderFrame = async (t) => {
    await inlineCSS();
    return rasterize(frameSVG(t));
  };

  window.exportFrames = async (from, to, fps = 30, concurrency = 6) => {
    await inlineCSS();
    const inflight = new Set();
    for (let i = from; i < to; i++) {
      const svg = frameSVG((i * 1000) / fps);
      const job = rasterize(svg)
        .then((blob) => fetch(`frame/${i}`, { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: blob }))
        .then((res) => { if (!res.ok) throw new Error(`frame ${i}: HTTP ${res.status}`); });
      inflight.add(job);
      job.then(() => inflight.delete(job), () => inflight.delete(job));
      if (inflight.size >= concurrency) await Promise.race(inflight);
    }
    await Promise.all(inflight);
    return { from, to, fps };
  };
})();

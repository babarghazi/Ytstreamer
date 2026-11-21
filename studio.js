const element = id => document.getElementById(id);
const video = element("video"), file = element("file"), trim = element("trim");
const start = element("start"), end = element("end"), status = element("status");
const download = element("download"), demo = element("demo");
let source, result, sourceUrl, resultUrl, stopAt, audio, output, gain;

function load(url, upload) {
  video.pause();
  stopAt = undefined;
  trim.disabled = true;
  download.hidden = true;
  result = undefined;
  source = upload;
  if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  if (resultUrl) URL.revokeObjectURL(resultUrl);
  sourceUrl = upload ? url : undefined;
  video.src = url;
  status.textContent = "Loading video…";
}

file.onchange = () => {
  const selected = file.files[0];
  if (selected) load(URL.createObjectURL(selected), selected);
};
demo.onclick = () => {
  file.value = "";
  load("./assets/demo-hype.mp4");
};
video.onloadedmetadata = () => {
  if (!Number.isFinite(video.duration)) {
    status.textContent = "Choose a video with a known duration.";
    return;
  }
  start.value = "0";
  start.max = end.max = String(video.duration);
  end.value = String(Math.min(video.duration, 60));
  trim.disabled = false;
  status.textContent = "Set the start and end, then preview or export.";
};
video.onerror = () => { status.textContent = "This video could not be opened. Try a browser-compatible MP4 or WebM."; };

function range() {
  const from = start.valueAsNumber, to = end.valueAsNumber;
  if (!(from >= 0 && to > from && to <= video.duration && to - from <= 60)) {
    throw new Error("Set a valid range of up to 60 seconds within the video.");
  }
  return [from, to];
}

function seek(time) {
  if (video.readyState >= 2 && Math.abs(video.currentTime - time) < .001) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const signal = AbortSignal.timeout(5000);
    signal.addEventListener("abort", () => reject(new Error("The video could not seek to that point.")));
    video.addEventListener("seeked", resolve, { once: true, signal });
    video.currentTime = time;
  });
}

video.ontimeupdate = () => {
  if (stopAt !== undefined && video.currentTime >= stopAt) {
    video.pause();
    stopAt = undefined;
  }
};

element("preview").onclick = async () => {
  try {
    const [from, to] = range();
    video.pause();
    stopAt = undefined;
    await seek(from);
    stopAt = to;
    await video.play();
  } catch (error) {
    status.textContent = error.message;
  }
};

element("export").onclick = async () => {
  let recorder, stream, frame, timeout;
  const controls = video.controls;
  try {
    const [from, to] = range();
    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 1280;
    if (!canvas.captureStream || !window.MediaRecorder || !window.AudioContext) {
      throw new Error("Export requires a browser with media recording support, such as current Chrome or Edge.");
    }
    trim.disabled = file.disabled = demo.disabled = true;
    video.controls = false;
    video.pause();
    stopAt = undefined;
    if (!audio) {
      audio = new AudioContext();
      output = audio.createMediaStreamDestination();
      gain = audio.createGain();
      const track = audio.createMediaElementSource(video);
      track.connect(output);
      track.connect(gain).connect(audio.destination);
    }
    await audio.resume();
    gain.gain.value = 0;
    await seek(from);
    const context = canvas.getContext("2d");
    const scale = (element("layout").value === "crop" ? Math.max : Math.min)(
      canvas.width / video.videoWidth, canvas.height / video.videoHeight);
    const w = video.videoWidth * scale, h = video.videoHeight * scale;
    const paint = () => {
      context.fillStyle = "#000";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(video, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    };
    paint();
    stream = canvas.captureStream(30);
    for (const track of output.stream.getAudioTracks()) stream.addTrack(track);
    const mimeType = ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find(type => MediaRecorder.isTypeSupported(type));
    recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks = [];
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    const saved = new Promise((resolve, reject) => {
      recorder.onstop = resolve;
      recorder.onerror = () => reject(new Error("The browser could not record this clip."));
    });
    recorder.start();
    await video.play();
    await Promise.race([saved, new Promise((resolve, reject) => {
      const step = () => {
        if (video.ended || video.currentTime >= to) {
          video.pause();
          resolve();
          return;
        }
        paint();
        status.textContent = "Exporting " + Math.round((video.currentTime - from) / (to - from) * 100) + "%";
        frame = requestAnimationFrame(step);
      };
      timeout = setTimeout(() => reject(new Error("Export timed out. Keep the tab active and try again.")), (to - from + 15) * 1000);
      step();
    })]);
    if (recorder.state !== "inactive") recorder.stop();
    await saved;
    const type = recorder.mimeType.split(";")[0] || "video/webm";
    const clip = new Blob(chunks, { type });
    if (!clip.size) throw new Error("The exported clip was empty.");
    result = new File([clip], type === "video/mp4" ? "hassan-clip.mp4" : "hassan-clip.webm", { type });
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    resultUrl = URL.createObjectURL(result);
    download.href = resultUrl;
    download.download = result.name;
    download.hidden = false;
    status.textContent = "Clip ready to download or save to private storage.";
  } catch (error) {
    status.textContent = error.message;
  } finally {
    cancelAnimationFrame(frame);
    clearTimeout(timeout);
    video.pause();
    video.controls = controls;
    if (gain) gain.gain.value = 1;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    for (const track of stream?.getVideoTracks() || []) track.stop();
    trim.disabled = !(Number.isFinite(video.duration) && video.duration > 0);
    file.disabled = demo.disabled = false;
  }
};

element("save-source").onclick = () => saveCloud(source, "sources");
element("save-clip").onclick = () => saveCloud(result, "clips");

async function saveCloud(upload, folder) {
  const cloudStatus = element("cloud-status");
  const key = element("cloud-key").value;
  if (!upload || !key) {
    cloudStatus.textContent = "Choose or export a video, then enter the storage key.";
    return;
  }
  const buttons = [element("save-source"), element("save-clip")];
  buttons.forEach(button => { button.disabled = true; });
  try {
    const { saveVideo } = await import("./storage-client.js");
    await saveVideo(upload, folder, key, percent => {
      cloudStatus.textContent = "Uploading " + Math.round(percent) + "%";
    });
    cloudStatus.textContent = "Saved to your private Vercel Blob store. View it in the Vercel dashboard.";
  } catch (error) {
    cloudStatus.textContent = "Upload failed. Check your storage key and Vercel Blob setup. " + error.message;
  } finally {
    buttons.forEach(button => { button.disabled = false; });
  }
}

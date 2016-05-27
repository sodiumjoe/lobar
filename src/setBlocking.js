export default function setBlocking() {
  [process.stdout, process.stderr].forEach(
    s => s && s.isTTY && s._handle && s._handle.setBlocking && s._handle.setBlocking(true)
  );
}

import UploadLocally from "./components/uploadLocally";


export default function ConvertLocalThumbs() {
  return (
    <main style={{ maxWidth: 800, margin: "50px auto" }}>
      <h1 style={{marginBottom:'40px'}}>Thumbnail Converter</h1>
      <UploadLocally/>
    </main>
  );
}

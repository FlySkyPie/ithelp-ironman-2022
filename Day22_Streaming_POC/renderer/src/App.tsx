import React, { useRef, useState } from 'react';
import { Canvas, MeshProps, useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from 'three';
import { io } from "socket.io-client";
import create from 'zustand'

const convetImage = (canvas: HTMLCanvasElement) => new Promise<Blob | null>((resolve) => {
  //canvas.toBlob((v) => resolve(v), 'image/webp');
  canvas.toBlob((v) => resolve(v), 'image/webp', 1);
});

const socket = io("http://localhost:3030").on('connection', () => {
  console.log('connection');
})

const Streamer: React.FC = () => {
  const lastUpdate = useRef(performance.now());

  useFrame(({ gl }) => {
    const now = performance.now();
    const diff = now - lastUpdate.current;
    if (diff > 50) {
      lastUpdate.current = now;

      const canvas = gl.domElement as HTMLCanvasElement;
      /*const value =canvas.toDataURL('image/png');
      socket.emit('render', value);
      console.log('sent image');
      return ;/** */

      convetImage(canvas).then(value => {
        if (value === null) {
          return;
        }
        value.arrayBuffer().then(buffer => {
          socket.emit('render', buffer);
          console.log('sent image', buffer.byteLength);
        }).catch(error => {
          console.warn(error)
        })

      })/** */
    }
  })
  return null;
}

function Box(props: MeshProps) {
  // This reference gives us direct access to the THREE.Mesh object
  const ref = useRef<any>()
  // Hold state for hovered and clicked events
  const [hovered, hover] = useState(false)
  const [clicked, click] = useState(false)
  // Subscribe this component to the render-loop, rotate the mesh every frame
  useFrame((state, delta) => (ref.current.rotation.x += 0.01))
  // Return the view, these are regular Threejs elements expressed in JSX
  return (
    <mesh
      {...props}
      ref={ref}
      scale={clicked ? 1.5 : 1}
      onClick={(event) => click(!clicked)}
      onPointerOver={(event) => hover(true)}
      onPointerOut={(event) => hover(false)}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={hovered ? 'hotpink' : 'orange'} />
    </mesh>
  )
}

interface HakoniwaStatae {
  cameras: CameraList,
  registerCamera: (key: string, ref: React.MutableRefObject<PerspectiveCamera>) => void,
  //increase: (by: number) => void
}

type CameraList = {
  [key: string]: React.MutableRefObject<PerspectiveCamera>,
}

const useBearStore = create<HakoniwaStatae>((set) => ({
  cameras: {},
  registerCamera: (key, ref) => set(({ cameras }) => ({ cameras: { ...cameras, key: ref } })),
}))


function App() {
  const [count, setCount] = useState(0)

  return (
    <Canvas gl={{ preserveDrawingBuffer: true }}>
      <Streamer />
      <color attach="background" args={["black"]} />
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <Box position={[-1.2, 0, 0]} />
      <Box position={[1.2, 0, 0]} />
    </Canvas>
  )
}

export default App

import { Nav } from '@/components/nav';
import { Renderer } from '@/components/renderer';

export default function App() {
  return (
    <div className='flex flex-col size-full items-center justify-center'>
      <Nav />
      <Renderer />
    </div>
  );
}

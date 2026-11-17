import type { ReactNode } from "react";
import { ProductChrome } from "../../components/ProductChrome";

export default function WatchLayout({ children }: { children: ReactNode }) {
  return (
    <ProductChrome active="watch" prototype>
      {children}
    </ProductChrome>
  );
}

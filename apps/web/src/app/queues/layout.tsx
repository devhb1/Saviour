import type { ReactNode } from "react";
import { ProductChrome } from "../../components/ProductChrome";

export default function QueuesLayout({ children }: { children: ReactNode }) {
  return (
    <ProductChrome active="queues" prototype>
      {children}
    </ProductChrome>
  );
}

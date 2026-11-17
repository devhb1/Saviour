import type { ReactNode } from "react";
import { ProductChrome } from "../../components/ProductChrome";

export default function AuditLayout({ children }: { children: ReactNode }) {
  return <ProductChrome active="audit">{children}</ProductChrome>;
}

import { type HTMLAttributes, forwardRef } from "react";

type TableProps = HTMLAttributes<HTMLTableElement>;

const Table = forwardRef<HTMLTableElement, TableProps>(
  ({ className = "", children, ...props }, ref) => {
    return (
      <div className="w-full overflow-x-auto">
        <table
          ref={ref}
          className={`w-full text-sm text-left ${className}`}
          {...props}
        >
          {children}
        </table>
      </div>
    );
  }
);

Table.displayName = "Table";

export function TableHeader({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <thead className={`text-xs text-dark-400 uppercase bg-dark-900 ${className}`}>
      {children}
    </thead>
  );
}

export function TableBody({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <tbody className={`divide-y divide-dark-700 ${className}`}>{children}</tbody>;
}

export function TableRow({
  children,
  className = "",
  ...props
}: {
  children: React.ReactNode;
  className?: string;
} & HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={`bg-dark-800 hover:bg-dark-750 transition-colors ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableCell({
  children,
  className = "",
  ...props
}: {
  children: React.ReactNode;
  className?: string;
} & HTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`px-4 py-3 text-white ${className}`} {...props}>
      {children}
    </td>
  );
}

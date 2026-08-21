import React, { useId } from "react";
import {
  UserCog,
  ReceiptText,
  Tractor,
  Landmark,
  HandCoins,
  Briefcase,
} from "lucide-react";

// Custom Logo Icon from image
export const LogoIcon = (props: React.SVGProps<SVGSVGElement>) => {
  const id1 = useId();
  const id2 = useId();
  const id3 = useId();
  const id4 = useId();
  const id5 = useId();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      viewBox="125 95 125 152"
      preserveAspectRatio="xMidYMid meet"
      {...props}
    >
      <defs>
        <clipPath id={id1}>
          <path
            d="M 130.289062 113.457031 L 245 113.457031 L 245 221.457031 L 130.289062 221.457031 Z M 130.289062 113.457031 "
            clipRule="nonzero"
          />
        </clipPath>
        <clipPath id={id2}>
          <path
            d="M 189 100.789062 L 219.75 100.789062 L 219.75 130 L 189 130 Z M 189 100.789062 "
            clipRule="nonzero"
          />
        </clipPath>
        <clipPath id={id3}>
          <path
            d="M 189 100.789062 L 200 100.789062 L 200 127 L 189 127 Z M 189 100.789062 "
            clipRule="nonzero"
          />
        </clipPath>
        <clipPath id={id4}>
          <path
            d="M 188 100.789062 L 197 100.789062 L 197 127 L 188 127 Z M 188 100.789062 "
            clipRule="nonzero"
          />
        </clipPath>
        <clipPath id={id5}>
          <path
            d="M 196 109 L 219.75 109 L 219.75 128 L 196 128 Z M 196 109 "
            clipRule="nonzero"
          />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id1})`}>
        <path
          fill="#1b7eb6"
          d="M 137.933594 213.902344 L 145.460938 213.902344 L 145.460938 221.546875 C 140.410156 221.546875 135.34375 221.546875 130.289062 221.546875 L 130.289062 177.734375 C 149.308594 167.015625 168.339844 156.292969 187.359375 145.570312 L 192.375 151.507812 L 158.121094 170.824219 L 158.121094 213.902344 L 237.054688 213.902344 L 237.054688 165.449219 L 214.703125 138.925781 L 203.558594 145.210938 L 224.511719 170.054688 L 224.511719 208.886719 L 216.871094 208.886719 L 216.871094 172.824219 L 175.0625 123.21875 L 158.121094 132.773438 L 158.121094 156.304688 L 150.476562 160.613281 L 150.476562 128.308594 L 176.804688 113.46875 L 198.542969 139.261719 L 216.433594 129.179688 L 244.699219 162.589844 L 244.699219 221.546875 C 237.964844 221.546875 231.246094 221.546875 224.511719 221.546875 L 224.511719 241.71875 L 150.476562 241.71875 L 150.476562 175.132812 L 137.945312 182.199219 L 137.945312 213.902344 Z M 158.121094 221.546875 L 158.121094 234.101562 L 216.871094 234.101562 L 216.871094 221.546875 Z M 158.121094 221.546875 "
          fillOpacity="1"
          fillRule="nonzero"
        />
      </g>
      <path
        fill="#1b7eb6"
        d="M 177.78125 179.351562 L 185.398438 179.351562 L 185.398438 186.96875 L 177.78125 186.96875 Z M 189.589844 191.164062 L 197.210938 191.164062 L 197.210938 198.78125 L 189.589844 198.78125 Z M 189.589844 179.351562 L 197.210938 179.351562 L 197.210938 186.96875 L 189.589844 186.96875 Z M 177.78125 191.164062 L 185.398438 191.164062 L 185.398438 198.78125 L 177.78125 198.78125 Z M 177.78125 191.164062 "
        fillOpacity="1"
        fillRule="evenodd"
      />
      <g clipPath={`url(#${id2})`}>
        <path
          fill="#8eb61b"
          d="M 201.066406 129.550781 C 200.863281 129.511719 200.125 129.425781 199.425781 129.363281 C 198.460938 129.269531 198.195312 129.183594 198.304688 129 C 198.585938 128.515625 201.972656 125.027344 203.5625 123.582031 C 205.847656 121.511719 208.75 119.488281 211.371094 118.148438 C 212.171875 117.738281 212.234375 117.667969 211.8125 117.664062 C 211.007812 117.65625 208.503906 118.566406 206.554688 119.578125 C 203.992188 120.910156 201.1875 123.082031 198.753906 125.632812 L 196.664062 127.820312 L 196.664062 126.625 C 196.667969 124.125 197.386719 121.386719 198.570312 119.382812 C 199.558594 117.707031 201.574219 115.804688 203.3125 114.910156 C 205.855469 113.601562 208.96875 113.335938 211.726562 112.335938 C 214.402344 111.363281 218.441406 110.269531 219.597656 109.003906 C 219.828125 108.753906 219.433594 115.917969 218.835938 117.855469 C 216.945312 124.019531 212.800781 127.957031 206.941406 129.15625 C 205.585938 129.433594 201.800781 129.6875 201.066406 129.550781 Z M 194.296875 125.863281 C 192.234375 123.726562 190.496094 120.722656 189.609375 117.753906 C 189.148438 116.214844 189.101562 115.785156 189.09375 112.882812 C 189.089844 110.132812 189.148438 109.46875 189.523438 108.027344 C 190.035156 106.078125 191.03125 104.71875 191.375 102.949219 C 191.511719 102.253906 191.453125 100.820312 191.453125 100.820312 L 193.386719 102.699219 C 196.296875 105.527344 199.984375 106.929688 201.777344 109.445312 C 202.59375 110.585938 203.785156 112.898438 203.785156 113.335938 C 203.785156 113.4375 203.089844 113.878906 202.238281 114.320312 C 201.386719 114.761719 200.242188 115.492188 199.695312 115.9375 C 199.144531 116.386719 198.675781 116.722656 199.695312 115.9375 C 199.144531 116.386719 198.675781 116.722656 198.652344 116.691406 C 198.632812 116.65625 198.300781 115.910156 197.914062 115.035156 C 197.207031 113.414062 195.253906 110.347656 194.851562 110.214844 C 194.726562 110.175781 194.960938 110.960938 195.371094 111.964844 C 195.78125 112.96875 196.40625 114.785156 196.757812 115.996094 L 197.398438 118.203125 L 196.867188 119.382812 C 196.28125 120.671875 195.429688 123.863281 195.210938 125.582031 L 195.074219 126.667969 Z M 194.296875 125.863281 "
          fillOpacity="1"
          fillRule="nonzero"
        />
      </g>
      <g clipPath={`url(#${id3})`}>
        <path
          fill="#8eb61b"
          d="M 194.296875 125.863281 C 192.234375 123.726562 190.496094 120.722656 189.609375 117.753906 C 189.148438 116.214844 189.101562 115.785156 189.09375 112.882812 C 189.089844 110.132812 189.148438 109.46875 189.523438 108.027344 C 190.035156 106.078125 191.03125 104.71875 191.375 102.949219 C 191.511719 102.253906 191.453125 100.820312 191.453125 100.820312 L 193.386719 102.699219 C 194.542969 103.820312 195.816406 104.71875 197.050781 105.550781 C 199.675781 108.011719 197.074219 110.972656 199.695312 115.9375 C 199.144531 116.386719 198.675781 116.722656 199.695312 115.9375 C 199.144531 116.386719 198.675781 116.722656 198.652344 116.691406 C 198.632812 116.65625 198.300781 115.910156 197.914062 115.035156 C 197.207031 113.414062 195.253906 110.347656 194.851562 110.214844 C 194.726562 110.175781 194.960938 110.960938 195.371094 111.964844 C 195.78125 112.96875 196.40625 114.785156 196.757812 115.996094 L 197.398438 118.203125 L 196.867188 119.382812 C 196.28125 120.671875 195.429688 123.863281 195.210938 125.582031 L 195.074219 126.667969 Z M 194.296875 125.863281 "
          fillOpacity="1"
          fillRule="nonzero"
        />
      </g>
      <g clipPath={`url(#${id4})`}>
        <path
          fill="#8eb61b"
          d="M 194.296875 125.863281 C 192.234375 123.726562 190.496094 120.722656 189.609375 117.753906 C 188.621094 114.511719 188.71875 111.144531 189.523438 108.027344 C 190.035156 106.078125 191.03125 104.71875 191.375 102.949219 C 191.511719 102.253906 191.453125 100.820312 191.453125 100.820312 C 193.667969 108.808594 187.496094 110.460938 196.105469 121.585938 C 195.390625 124.429688 195.332031 124.597656 195.210938 125.582031 L 195.074219 126.667969 Z M 194.296875 125.863281 "
          fillOpacity="1"
          fillRule="nonzero"
        />
      </g>
      <g clipPath={`url(#${id5})`}>
        <path
          fill="#8eb61b"
          d="M 198.753906 125.632812 L 196.664062 127.820312 L 196.664062 126.625 C 196.667969 124.125 197.386719 121.386719 198.570312 119.382812 C 199.558594 117.707031 201.574219 115.804688 203.3125 114.910156 C 205.855469 113.601562 208.96875 113.335938 211.726562 112.335938 C 214.402344 111.363281 218.441406 110.269531 219.597656 109.003906 C 217.039062 119.261719 202.394531 112.894531 198.753906 125.632812 Z M 198.753906 125.632812 "
          fillOpacity="1"
          fillRule="nonzero"
        />
      </g>
    </svg>
  );
};

export const DashboardIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    viewBox="0 0 24 24"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
    />
  </svg>
);

// Custom Icons from image
export const InvoicesIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182.553-.44 1.278-.659 2.003-.659.725 0 1.45.22 2.003.659l.879.659m0 0a2.25 2.25 0 002.25 2.25h1.5a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75v10.5A2.25 2.25 0 004.5 19.5z"
    />
  </svg>
);

export const ExpensesIcon = ({
  className,
  strokeWidth = 1.5,
  ...props
}: React.SVGProps<SVGSVGElement>) => (
  <ReceiptText
    {...(props as any)}
    className={className}
    strokeWidth={strokeWidth}
  />
);

export const AssetIcon = ({
  className,
  strokeWidth = 1.5,
  ...props
}: React.SVGProps<SVGSVGElement>) => (
  <Tractor
    {...(props as any)}
    className={className}
    strokeWidth={strokeWidth}
  />
);

export const CyclesIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
    {...props}
  >
    <polyline points="23 4 23 10 17 10"></polyline>
    <polyline points="1 20 1 14 7 14"></polyline>
    <path d="M20.49 9A9 9 0 0 0 5.64 5.64M3.51 15A9 9 0 0 0 18.36 18.36"></path>
  </svg>
);

export const SuppliersIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    viewBox="0 0 24 24"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m19.28 0H17.5m-5.25 0h-5.25m-1.5-13.5h14.25a.75.75 0 01.75.75v5.25c0 .414-.336.75-.75.75h-14.25a.75.75 0 01-.75-.75V8.25a.75.75 0 01.75-.75zM2.25 7.5L4.053 3.424A.75.75 0 014.738 3h14.524a.75.75 0 01.685.424L21.75 7.5"
    />
  </svg>
);

export const FarmerIcon = ({
  className,
  strokeWidth = 1.5,
  ...props
}: React.SVGProps<SVGSVGElement>) => (
  <UserCog
    {...(props as any)}
    className={className}
    strokeWidth={strokeWidth}
  />
);

export const FarmerAccountIcon = FarmerIcon;

export const UsersIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
    />
  </svg>
);

export const TreasuryIcon = ({
  className,
  strokeWidth = 1.5,
  ...props
}: React.SVGProps<SVGSVGElement>) => (
  <Landmark
    {...(props as any)}
    className={className}
    strokeWidth={strokeWidth}
  />
);

export const AdvancesIcon = ({
  className,
  strokeWidth = 1.5,
  ...props
}: React.SVGProps<SVGSVGElement>) => (
  <HandCoins
    {...(props as any)}
    className={className}
    strokeWidth={strokeWidth}
  />
);

export const ReportsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14 2v4a2 2 0 002 2h4"
    />
  </svg>
);

export const SettingsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066 2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

export const UserPlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19 7.5v9m-4.5-4.5h9M3.75 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632zM12 11.25a4.5 4.5 0 100-9 4.5 4.5 0 000 9z"
    />
  </svg>
);

export const UserCheckIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19 7.5l-3 3m0 0l-3-3m3 3V3.75m-15.25 16.368a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632zM12 11.25a4.5 4.5 0 100-9 4.5 4.5 0 000 9z"
    />
  </svg>
);

export const LogoutIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
    />
  </svg>
);

// Icons for MainContent Header
export const BellIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
    />
  </svg>
);

export const DownloadIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
    />
  </svg>
);

export const Bars3Icon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
    />
  </svg>
);

export const XMarkIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

// Icon for Theme Toggle
export const SunIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
    />
  </svg>
);

export const MoonIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
    />
  </svg>
);

export const DesktopIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-1.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z"
    />
  </svg>
);

// FIX: Added missing icons for ViewToggle component
export const Squares2x2Icon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
    />
  </svg>
);

export const TableCellsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.375 6.75h17.25M3.375 12h17.25m-17.25 5.25h17.25M5.25 3.75h13.5a2.25 2.25 0 012.25 2.25v13.5a2.25 2.25 0 01-2.25-2.25H5.25a2.25 2.25 0 01-2.25-2.25V6a2.25 2.25 0 012.25-2.25z"
    />
  </svg>
);

export const PencilIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
    />
  </svg>
);

// New Icons for Invoices
export const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 4.5v15m7.5-7.5h-15"
    />
  </svg>
);

export const TrendingUpIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.517L21.75 6M2.25 18h19.5"
    />
  </svg>
);

export const TrendingDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 6L9 12.75l4.286-4.286a11.95 11.95 0 015.814 5.516L21.75 18M2.25 6h19.5"
    />
  </svg>
);

export const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.067-2.09 1.02-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
    />
  </svg>
);

export const ClipboardIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a2.25 2.25 0 01-2.25 2.25h-1.5a2.25 2.25 0 01-2.25-2.25v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
    />
  </svg>
);

// Updated Scale Icon (Traditional Balance Scale)
export const ScaleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
    {...props}
  >
    <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
    <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
    <path d="M7 21h10" />
    <path d="M12 3v18" />
    <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
  </svg>
);

// Updated Box Icon (Lucide Package Style for cleaner 3D box)
export const BoxIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
    {...props}
  >
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22v-9" />
  </svg>
);

export const CartonIcon = BoxIcon;
export const CageIcon = BoxIcon;

export const ClipboardDocumentIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m3.375 7.5a1.125 1.125 0 00-1.125-1.125h-1.5a1.125 1.125 0 00-1.125 1.125v3.375c0 .621.504 1.125 1.125 1.125h1.5a1.125 1.125 0 001.125-1.125v-3.375z"
    />
  </svg>
);

export const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
    />
  </svg>
);

export const ChevronUpIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.5 15.75l7.5-7.5 7.5 7.5"
    />
  </svg>
);

// Updated Calendar Icon (Lucide Style for cleaner look)
export const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
    {...props}
  >
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </svg>
);

// Icons for Greenhouse Report
export const CreditCardIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75v10.5A2.25 2.25 0 004.5 19.5z"
    />
  </svg>
);

export const SubscriptionIcon = CreditCardIcon;

export const ChartBarIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
    />
  </svg>
);

export const ArrowRightIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
    />
  </svg>
);

// New icons for Treasury
export const ArrowLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 15.75L3 12m0 0l3.75-3.75M3 12h18"
    />
  </svg>
);

export const ChevronLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 19.5L8.25 12l7.5-7.5"
    />
  </svg>
);

export const ChevronRightIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8.25 4.5l7.5 7.5-7.5 7.5"
    />
  </svg>
);

export const SafeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 7.5l-9 5.25L3 7.5"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25v5.25" />
  </svg>
);

export const WalletIcon = ({
  className,
  strokeWidth = 1.5,
  ...props
}: React.SVGProps<SVGSVGElement>) => (
  <Briefcase
    {...(props as any)}
    className={className}
    strokeWidth={strokeWidth}
  />
);

export const UserMinusIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

// New Icons for Settings
export const UploadIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
    />
  </svg>
);

export const WarningIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
    />
  </svg>
);

// --- NEW: Icon for Auth Page success message ---
export const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

export const ShieldIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751A11.956 11.956 0 0112 2.714z"
    />
  </svg>
);

// --- New Icons for Dashboard & Cycle Report ---
export const ChartPieIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.5 6a7.5 7.5 0 100 15 7.5 7.5 0 000-15z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.5 10.5V6a1.5 1.5 0 013 0v1.5a1.5 1.5 0 01-3 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.5 10.5H18a1.5 1.5 0 010 3h-7.5a1.5 1.5 0 01-3 0V7.5a1.5 1.5 0 013 0v3z"
    />
  </svg>
);
export const ClockIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);
export const ArrowUpRightIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25"
    />
  </svg>
);

export const ArrowDownLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 4.5l-15 15m0 0h11.25m-11.25 0V8.25"
    />
  </svg>
);

export const WavyArrowUpIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 19l-7-7 4-4 7 7-4 4z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 12l4-4 7 7"
      transform="translate(-5, 4)"
    />
  </svg>
);
export const WavyArrowDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 5l-7 7 4 4 7-7-4-4z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 12l4 4 7-7"
      transform="translate(-5, -4)"
    />
  </svg>
);
export const BarChartSimpleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 20V10m4 10V4m4 16v-7"
    />
  </svg>
);

export const HomeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
    />
  </svg>
);

export const PercentIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7.5 7.5l9 9m-9 0l9-9"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.5 7.5a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm0 9a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm6-9a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
    />
  </svg>
);

export const EyeSlashIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243l-4.243-4.243"
    />
  </svg>
);

// Updated Truck Icon (Lucide Style for cleaner profile)
export const TruckIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
    {...props}
  >
    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
    <path d="M15 18H9" />
    <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
    <circle cx="17" cy="18" r="2" />
    <circle cx="7" cy="18" r="2" />
  </svg>
);

export const TractorIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    viewBox="0 0 24 24"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75"
    />
  </svg>
);

export const LeafIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    viewBox="0 0 24 24"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.048 8.287 8.287 0 0 0 9 9.6a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 18a3.75 3.75 0 0 0 .495-7.467 5.99 5.99 0 0 0-1.925 3.546 5.974 5.974 0 0 1-2.133-1A3.75 3.75 0 0 0 12 18z"
    />
  </svg>
);

export const EllipsisVerticalIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z"
    />
  </svg>
);

export const EllipsisHorizontalIcon = (
  props: React.SVGProps<SVGSVGElement>,
) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
    />
  </svg>
);

// --- NEW: Icons for Login ---
export const UserIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
    />
  </svg>
);

export const FingerPrintIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.263M12 3c1.782 0 3.444.62 4.757 1.659M3.93 11.235A7.458 7.458 0 0110.5 3M12 21c-2.676 0-5.216-.584-7.499-1.632A17.933 17.933 0 0112 15c2.676 0 5.216.584 7.499 1.632A17.933 17.933 0 0112 21zM9 9c0-1.657 1.343-3 3-3s3 1.343 3 3-1.343 3-3 3-3-1.343-3-3z"
    />
  </svg>
);

export const LockClosedIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
    />
  </svg>
);

export const EnvelopeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
    />
  </svg>
);

export const Cog6ToothIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.438.995s.145.755.438.995l1.003.827c.424.35.534.954.26 1.431l-1.296 2.247a1.125 1.125 0 01-1.37.49l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.127c-.332.183-.582.495-.645.87l-.213 1.281c-.09.543-.56.94-1.11.94h-2.593c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.063-.374-.313-.686-.645-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.37-.49l-1.296-2.247a1.125 1.125 0 01.26-1.431l 1.004-.827c.292-.24.437-.613.437-.995s-.145-.755-.437-.995l-1.004-.827a1.125 1.125 0 01-.26-1.431l1.296-2.247a1.125 1.125 0 011.37-.49l1.217.456c.355.133.75.072 1.076-.124.072-.044.146-.087.22-.127.332-.183.582-.495-.645-.87l.213-1.281z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

export const SparklesIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.572L16.5 21.75l-.398-1.178a3.375 3.375 0 00-2.456-2.456L12.5 17.25l1.178-.398a3.375 3.375 0 002.456-2.456L16.5 13.5l.398 1.178a3.375 3.375 0 002.456 2.456l1.178.398-1.178.398a3.375 3.375 0 00-2.456 2.456z"
    />
  </svg>
);

export const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path d="M16.75 13.96c.25.13.41.2.52.32.11.12.14.28.08.43-.06.15-.3.51-.57.78-.27.27-.55.42-.81.51-.26.09-.53.11-.78.04-.25-.07-.76-.25-1.44-.54l-.13-.05c-1.33-.56-2.43-1.4-3.3-2.43-.87-1.03-1.45-2.18-1.74-2.8-.08-.17-.12-.34-.12-.51 0-.17.03-.33.09-.48.06-.15.14-.29.25-.41.11-.12.23-.23.36-.3.13-.07.27-.11.41-.11.15,0,.29.02.43.08.14.06.26.13.35.23.09.1.16.2.2.31.04.11.06.22.04.33-.02.11-.07.23-.14.35l-1.03,2.3c-.07.15-.09.28-.07.4.02.12.09.23.19.33.1.1.22.17.34.19.12.02.25,0,.39-.07l.78-.44c.14-.08.28-.15.42-.21.14-.06.28-.1.41-.1.14,0,.28.02.4.08.13.06.24.14.33.25.09.11.15.24.18.38.03.14.02.29-.03.43-.05.14-.14.28-.27.42l-.24.24c-.1.1-.17.2-.21.31-.04.11-.06.22-.04.33.02.11.06.23.14.35ZM12,2A10,10,0,1,0,22,12,10,10,0,0,0,12,2Zm0,18a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" />
  </svg>
);

// --- NEW: Icons for Offline Status ---
export const CloudIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-2.43-2.43A3.75 3.75 0 0013.5 4.5h-4.5a4.5 4.5 0 00-4.5 4.5v.75"
    />
  </svg>
);

export const CloudSlashIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11.25 4.5l7.5 7.5-7.5 7.5"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.28 16.592A4.5 4.5 0 012.25 15v-.75a4.5 4.5 0 014.5-4.5h4.5m0-3.75a3.75 3.75 0 017.44-1.227 3 3 0 012.43 2.43A3.75 3.75 0 0118 19.5H6.75"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
  </svg>
);

// --- NEW: Icons for Notifications ---
export const DollarIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182.553-.44 1.278-.659 2.003-.659.725 0 1.45.22 2.003.659l.879.659m0 0c-1.171.879-3.07.879-4.242 0-1.172-.879-1.172-2.303 0-3.182C10.464 7.219 11.232 7 12 7c.725 0 1.45.22 2.003.659 1.106.879 1.106-2.303 0 3.182-.553.44-1.278-.659-2.003-.659-.725 0-1.45-.22-2.003-.659m0 0l-.879.659"
    />
  </svg>
);

export const LightBulbIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.311a7.5 7.5 0 01-7.5 0c-1.421 0-2.8-.468-4.002-1.317a.75.75 0 01.13-1.247m11.745 0a.75.75 0 00.13 1.247c-1.202.849-2.581 1.317-4.002 1.317a7.5 7.5 0 01-7.5 0"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 9.375c.354.146.72.25 1.125.313m2.75 0c.405-.063.771-.167 1.125-.313M9 9.375c-.354-.146-.72-.25-1.125-.313M15 9.375c.405.063.771.167 1.125.313M9 9.375a3.75 3.75 0 013-3.75m0 0a3.75 3.75 0 013 3.75M9 9.375a3.75 3.75 0 01-3 3.75m12 0a3.75 3.75 0 01-3-3.75"
    />
  </svg>
);

export const UserGroupIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-7.5-2.962c.57-1.023-.09-2.075-1.14-2.075H12a3 3 0 00-3 3v.01M6 18.72a9.094 9.094 0 013.741-.479 3 3 0 01-4.682-2.72m-7.5-2.962c.57-1.023-.09-2.075-1.14-2.075H6a3 3 0 013 3v.01"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 12.72a3 3 0 00-3-3H6a3 3 0 00-3 3v.01M18 12.72a3 3 0 01-3-3h-1.5a3 3 0 01-3 3v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

export const CheckIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.5 12.75l6 6 9-13.5"
    />
  </svg>
);

export const GreenhouseIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    viewBox="0 0 24 24"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 21h19.5M4.5 21V9.75a7.5 7.5 0 0115 0V21M3 15.75h18M3 11.25h18"
    />
  </svg>
);

export const PhotoIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
    />
  </svg>
);

// Lucide Style Icons
export const LucideSprout = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
    {...props}
  >
    <path d="M7 20h10" />
    <path d="M10 20c5.5-2.5.8-6.4 3-10" />
    <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.6" />
    <path d="M14 14.3c-1 2.9-.8 6.9-4 5.7" />
    <path d="M12 2a4 4 0 0 1 4 4c0 2-2.5 3-4.5 3" />
  </svg>
);

export const SeedlingIcon = LucideSprout;

export const LucideUsers = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
    {...props}
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const LucideFlaskConical = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
    {...props}
  >
    <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" />
    <path d="M8.5 2h7" />
    <path d="M7 16h10" />
  </svg>
);

export const LucideWrench = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
    {...props}
  >
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

export const LucideFuel = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
    {...props}
  >
    <line x1="3" x2="15" y1="22" y2="22" />
    <line x1="4" x2="14" y1="9" y2="9" />
    <path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18" />
    <path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5" />
  </svg>
);

export const LucidePackage = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
    {...props}
  >
    <path d="m7.5 4.27 9 5.15" />
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22v-9" />
  </svg>
);

export const LucideTag = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
    {...props}
  >
    <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l5 5a2 2 0 0 0 2.828 0l7.172-7.172a2 2 0 0 0 0-2.828l-5-5z" />
    <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
  </svg>
);

export const TypeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
    {...props}
  >
    <polyline points="4 7 4 4 20 4 20 7" />
    <line x1="9" x2="15" y1="20" y2="20" />
    <line x1="12" x2="12" y1="4" y2="20" />
  </svg>
);

export const InfoIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11.25 11.25l.041-.02a.75.75 0 111.063.852l-.708 2.836a.75.75 0 001.063.852l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
    />
  </svg>
);

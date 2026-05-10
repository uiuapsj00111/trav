import React from 'react';
import { Globe, MessageSquare } from 'lucide-react';

const Footer = () => {
  const footerLinks = [
    {
      title: 'SPORTSBOOK',
      links: [
        { name: 'Home', href: '#' },
        { name: 'Soccer', href: '#' },
        { name: 'Basketball', href: '#' },
        { name: 'Tennis', href: '#' },
        { name: 'Counter-Strike', href: '#' },
        { name: 'FIFA', href: '#' },
        { name: 'Hockey', href: '#' },
        { name: 'Baseball', href: '#' },
      ],
    },
    {
      title: 'POLICIES',
      links: [
        { name: 'Terms of Service', href: '#' },
        { name: 'Privacy Policy', href: '#' },
        { name: 'Bonus & Promotion', href: '#' },
        { name: 'Responsible Gaming', href: '#' },
        { name: 'AML/KYC Policy', href: '#' },
        { name: 'Cookie Policy', href: '#' },
        { name: 'Fair Play Policy', href: '#' },
      ],
    },
    {
      title: 'PROMOS',
      links: [
        { name: 'VIP Club', href: '#' },
        { name: 'Promotions', href: '#' },
        { name: 'Redeem a Promo', href: '#' },
        { name: 'Affiliate Program', href: '#' },
      ],
    },
    {
      title: 'SUPPORT',
      links: [
        { name: 'About Us', href: '#' },
        { name: 'Live Support', href: '#' },
        { name: 'Help Center', href: '#' },
        { name: 'Responsible Gambling', href: '#' },
        { name: 'Vulnerability Disclosure', href: '#' },
        { name: 'Self-Exclusion', href: '#' },
      ],
    },
  ];

  const currencyIcons = [
    { symbol: '₿', color: 'text-[#F7931A]' },
    { symbol: 'Ξ', color: 'text-[#627EEA]' },
    { symbol: '◎', color: 'text-[#14F195]' },
    { symbol: 'S', color: 'text-[#2775CA]' },
    { symbol: 'B', color: 'text-[#F3BA2F]' },
    { symbol: 'T', color: 'text-[#26A17B]' },
    { symbol: 'Ł', color: 'text-[#345D9D]' },
    { symbol: 'Ð', color: 'text-[#C2A633]' },
    { symbol: '$', color: 'text-[#26A17B]' },
  ];

  const partners = [
    { name: 'affpapa', subtitle: 'Leading Awards 2023 — Winner' },
    { name: 'Best Start-Up Company of the Year', icon: '★' },
    { name: 'Best Online Casino Product of the Year', icon: '★' },
  ];

  const paymentMethods = ['Interac', 'PIX', 'MiFinity', 'UPI'];

  return (
    <footer className="bg-[#0b0e18] pt-16 pb-8 px-6 lg:px-24 border-t border-[#232a42] w-full mt-12">
      <div className="max-w-[1440px] mx-auto">
        {/* Navigation Columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          {footerLinks.map((column) => (
            <div key={column.title}>
              <h3 className="text-[11px] font-bold text-white tracking-widest mb-6 uppercase">
                {column.title}
              </h3>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-[13px] text-[#9299a1] hover:text-white transition-colors duration-200"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Social and Currencies Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12 border-t border-[#232a42] pt-8">
          <div className="flex flex-wrap gap-3">
            <div className="w-10 h-10 bg-[#1c223a] rounded-lg flex items-center justify-center hover:bg-[#232a42] cursor-pointer transition-colors">
              <MessageSquare className="w-5 h-5 text-[#9299a1]" />
            </div>
            {currencyIcons.map((currency, idx) => (
              <div
                key={idx}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold ${currency.color}`}
                style={{ backgroundColor: 'rgba(35, 42, 66, 0.4)' }}
              >
                <div>{currency.symbol}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-6">
            <button className="flex items-center gap-2 text-[13px] font-semibold text-white bg-[#15192c] border border-[#232a42] px-4 py-2 rounded-md hover:bg-[#1c223a] transition-colors">
              <Globe className="w-4 h-4" />
              English
              <span className="text-[10px] ml-1 opacity-60">▼</span>
            </button>
          </div>
        </div>

        {/* Awards / Partners Section */}
        <div className="flex flex-wrap gap-4 mb-12">
          {partners.map((partner, idx) => (
            <div
              key={idx}
              className="bg-[#15192c] border border-[#232a42] rounded-xl p-5 min-w-[240px] flex flex-col items-start gap-2"
            >
              {partner.icon && <span className="text-[#ffc132] text-sm">{partner.icon}</span>}
              <div className="text-[14px] font-bold text-white">
                {partner.name === 'affpapa' ? (
                  <span className="text-[#ffc132]">affpapa</span>
                ) : (
                  partner.name
                )}
              </div>
              <div className="text-[11px] text-[#9299a1]">{partner.subtitle || ''}</div>
            </div>
          ))}
        </div>

        {/* Payment Methods */}
        <div className="flex flex-wrap gap-4 mb-12">
          {paymentMethods.map((method) => (
            <div
              key={method}
              className="bg-[#15192c] border border-[#232a42] rounded-md px-6 py-2 text-[12px] font-bold text-[#9299a1]"
            >
              {method}
            </div>
          ))}
          <div className="ml-auto flex items-center gap-4 opacity-50 grayscale hover:grayscale-0 transition-all duration-300">
             <div className="w-12 h-12 bg-white/10 rounded-full"></div>
             <div className="w-16 h-8 bg-white/10 rounded"></div>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="text-[12px] leading-[1.8] text-[#5c6274] max-w-[1000px]">
          <p className="mb-4">
            © 2026 Roobet N.V. All rights reserved. Roobet is operated by Roobet N.V., a company registered and established under the laws of Curaçao, holding gaming licence No. 8048/JAZ2019-015 issued by Gaming Curacao. Gambling involves risk. Please gamble responsibly and only bet what you can afford to lose. This website is intended for users aged 18 and above only.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

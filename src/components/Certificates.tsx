import React, { useState } from "react";
import { Award, Calendar, ExternalLink, X, Eye } from "lucide-react";
import { Certificate } from "../types";

interface CertificatesProps {
  certificates: Certificate[];
}

export default function Certificates({ certificates }: CertificatesProps) {
  const [activeCert, setActiveCert] = useState<Certificate | null>(null);

  return (
    <section id="certificates" className="relative py-20 border-t border-purple-500/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center md:text-left mb-16 space-y-2">
          <div className="inline-flex items-center space-x-2">
            <span className="w-8 h-px bg-pink-500"></span>
            <span className="font-mono text-xs text-pink-500 uppercase tracking-widest">// RECON_CREDENTIALS</span>
          </div>
          <h2 className="font-sans font-black text-4xl sm:text-5xl text-white tracking-tight uppercase">
            CHỨNG CHỈ LẬP TRÌNH
          </h2>
        </div>

        {/* Credentials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {certificates.length > 0 ? (
            certificates.map((cert) => (
              <div
                key={cert.id}
                className="group relative flex flex-col bg-gray-950/45 border border-purple-500/10 hover:border-pink-500/40 p-5 rounded-lg backdrop-blur-sm transition-all duration-300 hover:shadow-[0_0_20px_rgba(244,63,94,0.12)]"
              >
                {/* Visual Preview Box */}
                {cert.imageUrl ? (
                  <div className="relative aspect-video rounded overflow-hidden bg-gray-900 border border-gray-900 mb-4">
                    <img
                      src={cert.imageUrl}
                      alt={cert.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 grayscale group-hover:grayscale-0 brightness-75 group-hover:brightness-100"
                      referrerPolicy="no-referrer"
                    />
                    {/* Hover Eye indicator */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                      <button
                        onClick={() => setActiveCert(cert)}
                        className="p-2 bg-pink-500 text-white rounded-full hover:bg-pink-600 transition-colors duration-150 cursor-pointer shadow"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video rounded bg-gray-900/60 border border-gray-800 flex items-center justify-center mb-4">
                    <Award className="w-8 h-8 text-pink-500 opacity-40" />
                  </div>
                )}

                {/* Info Text details */}
                <div className="flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-sans font-extrabold text-sm sm:text-base text-white leading-snug group-hover:text-pink-400 transition-colors duration-150 uppercase tracking-wide">
                      {cert.name}
                    </h3>
                    <p className="font-mono text-[11px] text-gray-500 font-bold tracking-wider">
                      // ĐƠN VỊ: <span className="text-gray-300">{cert.issuer}</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-900 pt-3">
                    <div className="flex items-center gap-1.5 font-mono text-[10px] text-gray-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{cert.issueDate}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {cert.imageUrl && (
                        <button
                          onClick={() => setActiveCert(cert)}
                          className="font-mono text-[9px] font-bold text-cyan-400 hover:text-white transition-colors duration-150 uppercase"
                        >
                          XEM ẢNH
                        </button>
                      )}
                      {cert.credentialUrl && (
                        <a
                          href={cert.credentialUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[9px] font-bold text-pink-400 hover:text-white transition-colors duration-150 flex items-center gap-0.5 uppercase"
                        >
                          XÁC THỰC
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            ))
          ) : (
            <div className="col-span-full py-12 text-center border border-dashed border-gray-800 rounded-lg">
              <span className="font-mono text-xs text-gray-500 uppercase tracking-widest animate-pulse">
                // CERTIFICATE REGISTRY INACTIVE
              </span>
            </div>
          )}
        </div>

        {/* Certificate Image Lightbox modal view */}
        {activeCert && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
            <div className="relative max-w-2xl w-full bg-[#0a0518] border border-pink-500/40 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(244,63,94,0.3)]">
              <div className="p-4 flex items-center justify-between border-b border-gray-900 bg-gray-950/60">
                <span className="font-mono text-xs text-gray-400 uppercase tracking-widest">
                  [ SCREEN_VIEW_PREVIEW ]
                </span>
                <button
                  onClick={() => setActiveCert(null)}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-900 rounded cursor-pointer transition-colors duration-150"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {activeCert.imageUrl ? (
                <div className="bg-black flex items-center justify-center p-2">
                  <img
                    src={activeCert.imageUrl}
                    alt={activeCert.name}
                    className="max-h-[70vh] object-contain rounded"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="py-24 flex items-center justify-center bg-gray-950">
                  <Award className="w-16 h-16 text-pink-500 animate-pulse" />
                </div>
              )}

              <div className="p-5 bg-gray-950/45 border-t border-gray-900">
                <h3 className="font-sans font-extrabold text-base text-white uppercase tracking-wide">
                  {activeCert.name}
                </h3>
                <p className="font-mono text-xs text-pink-400 mt-1 uppercase">
                  {activeCert.issuer} &mdash; {activeCert.issueDate}
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}

import { useState, useEffect } from 'react';
import { Shield, Code, Users, Heart } from 'lucide-react';

export default function TeamCredits() {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    setIsVisible(true);
  }, []);

  const team = [
    "Devendra Kumar Dewangan",
    "Somil Agrawal",
    "Abhishek Dixit",
    "Soumyadeep Biswas",
    "Alefiya Hirani",
    "Akshat Mishra"
  ];

  return (
    <div className="w-full bg-slate-900 text-white py-16 overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute top-10 right-10 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-64 h-64 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <div className={`transition-all duration-1000 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          
          <div className="flex flex-col items-center justify-center mb-12 text-center">
            <div className="inline-flex items-center justify-center p-3 bg-blue-600/20 rounded-full mb-4 animate-pulse">
              <Shield className="w-8 h-8 text-blue-400" />
            </div>
            <h2 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-4">
              RockShield
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">
              Advanced safety solutions engineered with passion.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            {team.map((member, index) => (
              <div 
                key={index}
                className="group relative p-6 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10"
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg group-hover:scale-110 transition-transform duration-300">
                    {member.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-slate-200 group-hover:text-white transition-colors">
                      {member}
                    </h3>
                    <div className="text-xs text-blue-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-x-[-10px] group-hover:translate-x-0">
                      <Code size={12} />
                      <span>Developer</span>
                    </div>
                  </div>
                </div>
                <div className="absolute inset-0 border border-blue-500/0 rounded-xl group-hover:border-blue-500/20 transition-all duration-500"></div>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <div className="inline-flex items-center gap-2 text-slate-500 text-sm">
              <span>Made with</span>
              <Heart className="w-4 h-4 text-red-500 animate-bounce" fill="currentColor" />
              <span>by the RockShield Team</span>
            </div>
          </div>

        </div>
      </div>
      
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
